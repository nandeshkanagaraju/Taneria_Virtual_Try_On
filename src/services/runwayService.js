// src/services/runwayService.js

// NOTE: We use the proxy path defined in vite.config.js
const API_BASE = "/runway-api";
const RUNWAY_VERSION = "2024-11-06";

const resizeAndConvertImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            // Max 1024 is optimal for Gen-4
            const MAX_SIZE = 1024;
            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            // High quality jpeg
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = () => reject("Could not load image");
        img.src = url;
    });
};

async function startImageGeneration(prompt, imageUris, apiKey) {
    const response = await fetch(`${API_BASE}/v1/text_to_image`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "X-Runway-Version": RUNWAY_VERSION,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gen4_image",
            ratio: "1280:720",
            promptText: prompt,
            referenceImages: imageUris.map(uri => ({ uri })),
            seed: Math.floor(Math.random() * 1000000)
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Runway Start Error (${response.status}): ${errText}`);
    }
    const data = await response.json();
    return data.id;
}

async function pollTask(taskId, apiKey) {
    const pollInterval = 3000;
    while (true) {
        const response = await fetch(`${API_BASE}/v1/tasks/${taskId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "X-Runway-Version": RUNWAY_VERSION,
            },
        });
        if (!response.ok) throw new Error("Failed to poll Runway task");
        const data = await response.json();
        const status = data.status;
        console.log(`Runway Task ${taskId}: ${status}`);

        if (status === "SUCCEEDED") {
            if (data.output && data.output.length > 0) return data.output[0];
            throw new Error("Task succeeded but returned no images.");
        } else if (status === "FAILED" || status === "CANCELED") {
            throw new Error(`Runway Failed: ${data.failureReason || status}`);
        }
        await new Promise(r => setTimeout(r, pollInterval));
    }
}

export async function performVirtualTryOn(baseImage, jewelryItem, apiKey) {
    try {
        console.log("Step 1: Resizing & Preparing Images...");
        const baseUri = await resizeAndConvertImage(baseImage);
        const jewelryUri = await resizeAndConvertImage(jewelryItem.src);

        // --- NATURAL BLEND PROMPT LOGIC ---
        let prompt = "";

        if (jewelryItem.type === 'clothing') {
            // --- CLOTHING (Saree/Kurta) ---
            prompt = `
          A realistic photo composite where the person in Reference Image 1 is wearing the outfit from Reference Image 2.

          INSTRUCTIONS:
          1. IDENTITY: Keep the person's face, hair, and body shape exactly the same.
          2. OUTFIT: Replace the original clothes with the Saree/Dress from Image 2.
          3. NATURAL LOOK: Do not add studio lighting or filters. Match the lighting and resolution of the original user photo.
          4. FIT: The clothes should fit the person naturally with realistic folds.
          5. RESULT: It should look like a normal photo taken of the person wearing these clothes, not a digital art piece.
        `;
        } else {
            // --- JEWELRY (Necklace/Earrings) ---
            const placement = jewelryItem.type === 'earring' ? 'ears' : 'neck';

            // Physics instructions for fit
            const physics = jewelryItem.type === 'necklace'
                ? "The necklace must sit naturally on the skin of the neck/collarbone area. It should not look like a sticker."
                : "The earrings must hang naturally from the earlobes.";

            prompt = `
          A realistic photo composite. Put the Jewelry from Reference Image 2 onto the ${placement} of the Person in Reference Image 1.

          STRICT RULES:
          1. KEEP THE PERSON EXACTLY THE SAME. Do not change their face or skin tone.
          2. KEEP THE JEWELRY EXACTLY THE SAME. Keep the gold texture and design details.
          3. NATURAL LIGHTING: Match the lighting of the jewelry to the person's skin. Do not make it overly shiny or fake.
          4. POSITION: ${physics}
          
          STYLE: Natural photography. Realistic blend. No CGI effects.
        `;
        }

        console.log("Step 2: Starting Runway Gen-4 Task...");
        const taskId = await startImageGeneration(prompt, [baseUri, jewelryUri], apiKey);

        console.log(`Step 3: Polling Task ID: ${taskId}`);
        const finalImageUrl = await pollTask(taskId, apiKey);

        return finalImageUrl;

    } catch (error) {
        console.error("Runway Service Error:", error);
        throw error;
    }
}