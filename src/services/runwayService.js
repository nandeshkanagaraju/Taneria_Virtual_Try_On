// src/services/runwayService.js

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
            resolve(canvas.toDataURL('image/jpeg', 0.9));
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

        // --- DYNAMIC PROMPT LOGIC ---
        let prompt = "";

        // CHECK TYPE: Is it Clothing or Jewelry?
        if (jewelryItem.type === 'clothing') {
            // --- CLOTHING PROMPT (Whole body replacement) ---
            prompt = `
          A photorealistic image where the person in the first reference image is wearing the OUTFIT from the second reference image.

          STRICT INSTRUCTIONS:
          1. IDENTITY: Keep the person's face, hair, skin tone, and body shape exactly the same.
          2. CLOTHING SWAP: Completely replace the person's current clothes with the Saree/Dress/Kurta from the second image.
          3. FIT: Ensure the new outfit fits the person's body perfectly. Maintain realistic fabric folds, draping, and texture.
          4. DETAILS: Transfer the exact color, pattern, and embroidery of the reference outfit.
          5. COMPOSITION: Do not crop the head. Keep the background neutral.
        `;
        } else {
            // --- JEWELRY PROMPT (Add object) ---
            const placement = jewelryItem.type === 'earring' ? 'ears' : 'neck';
            prompt = `
          A photorealistic composite image combining the person from the first reference image and the jewelry from the second reference image.

          TASK: Transfer the jewelry OBJECT from the second image onto the ${placement} of the person in the first image.

          STRICT RULES:
          1. EXACT REPLICA: Use the EXACT design and texture of the jewelry reference.
          2. IDENTITY: Keep the person's face, hair, and skin tone identical.
          3. PHYSICS: The jewelry must drape naturally on the ${placement}. Apply gravity so it sits flat against the skin.
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