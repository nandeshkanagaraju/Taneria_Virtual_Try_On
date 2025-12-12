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
            // FIXED: Only one model definition
            model: "gemini_2.5_flash",
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
            // FIXED: Properly access failure reason from the data object
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
            // --- CLOTHING PROMPT ---
            prompt = `
        Act as a photo editor. Replace outfit.
        Input 1: Model.
        Input 2: Outfit.
        
        Instructions:
        1. Keep face/hair 100% identical.
        2. Replace current clothes with Outfit (Input 2).
        3. Realistic fit and drape.
        `;

        } else if (jewelryItem.type === 'set') {
            // --- JEWELRY SET PROMPT ---
            prompt = `
        Act as a professional jewelry editor.
        Task: Virtual Try-On of a Full Jewelry Set.
        
        Input 1: Customer.
        Input 2: Jewelry Set (Contains Necklace AND Earrings).

        CRITICAL CLEANUP:
        - If Customer is wearing OLD necklace or earrings, ERASE THEM completely.
        - Restore skin texture before placing new items.

        PLACEMENT RULES:
        1. Identify the Necklace in Input 2: Place it around the neck, resting on the chest. Show full length.
        2. Identify the Earrings in Input 2: Place them hanging vertically from the earlobes.

        STRICT REQUIREMENTS:
        - Face & Skin Identity: 100% Unchanged.
        - Product Accuracy: Use exact design from Input 2.
        - Physics: Natural gravity and shadows.
        `;

        } else {
            // --- SINGLE ITEM PROMPT ---
            const typeName = jewelryItem.type === 'earring' ? 'Earrings' : 'Necklace';
            const targetArea = jewelryItem.type === 'earring' ? 'ears' : 'neck';

            let pos;
            if (jewelryItem.type === 'necklace') {
                pos = "The necklace must rest naturally on the skin of the upper chest/sternum. Show the full length of the chain.";
            } else {
                pos = "The earrings must hang vertically from the earlobes.";
            }

            prompt = `
        Act as a professional jewelry retoucher.
        Task: Virtual Try-On (${typeName}).
        
        Input 1: Customer.
        Input 2: ${typeName}.
        
        CRITICAL CLEANUP:
        - Remove any existing jewelry on ${targetArea}.
        
        EXECUTION:
        1. Place ${typeName} (Input 2) onto customer.
        2. Placement: ${pos}
        3. Identity: Keep face 100% identical.
        4. Product: Exact design from Input 2.
        `;
        }

        console.log("Step 2: Starting Runway Task (Gemini 2.5 Flash)...");
        const taskId = await startImageGeneration(prompt, [baseUri, jewelryUri], apiKey);

        console.log(`Step 3: Polling Task ID: ${taskId}`);
        return await pollTask(taskId, apiKey);

    } catch (error) {
        console.error("Runway Service Error:", error);
        throw error;
    }
}