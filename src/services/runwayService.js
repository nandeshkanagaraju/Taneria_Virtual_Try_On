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
            // Using the Gemini model via Runway
            model: "gemini_2.5_flash",

            // FIXED: Used a valid ratio from the error message list
            // Valid options: "1024:1024", "1344:768", "768:1344", "1184:864"
            ratio: "1024:1024",

            promptText: prompt.substring(0, 999),
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
            const reason = data.failureReason || data.error || status;
            throw new Error(`Runway Failed: ${reason}`);
        }
        await new Promise(r => setTimeout(r, pollInterval));
    }
}

export async function performVirtualTryOn(baseImage, jewelryItem, apiKey) {
    try {
        console.log("Step 1: Resizing & Preparing Images...");
        const baseUri = await resizeAndConvertImage(baseImage);
        const jewelryUri = await resizeAndConvertImage(jewelryItem.src);

        let prompt;

        if (jewelryItem.type === 'clothing') {
            // --- CLOTHING PROMPT (Gemini Logic) ---
            prompt = `
        Act as a professional photo editor.
        Task: Replace the outfit.
        
        Input 1: Model.
        Input 2: New Outfit.
        
        Instructions:
        1. Keep the Model's face, hair, and body shape 100% IDENTICAL.
        2. Replace current clothes with the Outfit from Input 2.
        3. Ensure realistic fit, draping, and lighting.
        `;

        } else {
            // --- JEWELRY PROMPT (Gemini Logic) ---
            const typeName = jewelryItem.type === 'earring' ? 'Earrings' : 'Necklace';

            let pos;
            if (jewelryItem.type === 'necklace') {
                pos = "The necklace must drape naturally around the neck and rest on the upper chest (sternum). Show the FULL length of the chain. Do not crop.";
            } else {
                pos = "The earrings must hang vertically from the earlobes.";
            }

            prompt = `
        Act as a professional jewelry photographer.
        Task: Virtual Try-On.
        
        Input 1: Customer.
        Input 2: ${typeName} Product.
        
        Strict Requirements:
        1. IDENTITY: Keep the Customer's face and skin tone 100% pixel-perfect. Do not retouch face.
        2. PRODUCT: Use the EXACT design of the ${typeName} from Input 2. Do not hallucinate new gems.
        3. PLACEMENT: ${pos}
        4. PHYSICS: Apply gravity. It should look like a real photo, not a sticker.
        `;
        }

        console.log("Step 2: Starting Runway Task (Model: gemini_2.5_flash)...");
        const taskId = await startImageGeneration(prompt, [baseUri, jewelryUri], apiKey);

        console.log(`Step 3: Polling Task ID: ${taskId}`);
        return await pollTask(taskId, apiKey);

    } catch (error) {
        console.error("Runway Service Error:", error);
        throw error;
    }
}