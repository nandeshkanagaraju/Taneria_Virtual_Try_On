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

async function startImageGeneration(prompt, imageUris, apiKey, modelName) {
    const response = await fetch(`${API_BASE}/v1/text_to_image`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "X-Runway-Version": RUNWAY_VERSION,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            // DYNAMIC MODEL SELECTION
            model: modelName,

            // 1024:1024 is the safest ratio supported by BOTH models
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
        let selectedModel;

        // --- DYNAMIC MODEL SELECTION ---

        if (jewelryItem.type === 'clothing') {
            // --- 1. CLOTHING -> USE GEN-4 (Better Fabric/Lighting) ---
            selectedModel = "gen4_image";

            prompt = `
          Photo composite. Person from Ref 1 wearing Outfit from Ref 2.
          
          RULES:
          1. IDENTITY: Keep face, hair, and body shape 100% same.
          2. OUTFIT: Replace clothes with Ref 2 (Saree/Dress).
          3. TEXTURE: Use the exact pattern and border from Ref 2.
          4. FIT: Realistic drape and fabric folds.
          5. STYLE: Cinematic lighting, photorealistic.
        `;

        } else {
            // --- 2. JEWELRY -> USE GEMINI 2.5 (Better Logic/Anatomy) ---
            selectedModel = "gemini_2.5_flash";

            if (jewelryItem.type === 'set') {
                // JEWELRY SET PROMPT
                prompt = `
            Act as a professional jewelry editor.
            Task: Virtual Try-On of a Full Jewelry Set.
            Input 1: Customer.
            Input 2: Jewelry Set (Necklace + Earrings).

            CRITICAL CLEANUP:
            - If Customer is wearing OLD necklace or earrings, ERASE THEM completely.
            - Restore skin texture.

            PLACEMENT:
            1. Necklace: Rest on upper chest/sternum. Show full length.
            2. Earrings: Hang vertically from earlobes.

            REQUIREMENTS:
            - Face Identity: 100% Unchanged.
            - Product: Exact design from Input 2.
            - Physics: Natural gravity.
            `;
            } else {
                // SINGLE ITEM PROMPT
                const typeName = jewelryItem.type === 'earring' ? 'Earrings' : 'Necklace';
                const targetArea = jewelryItem.type === 'earring' ? 'ears' : 'neck';

                let pos;
                if (jewelryItem.type === 'necklace') {
                    pos = "The necklace must rest naturally on the skin of the upper chest/sternum. Show the full length of the chain. Do not crop.";
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
        }

        console.log(`Step 2: Starting Runway Task using Model: ${selectedModel}...`);
        const taskId = await startImageGeneration(prompt, [baseUri, jewelryUri], apiKey, selectedModel);

        console.log(`Step 3: Polling Task ID: ${taskId}`);
        return await pollTask(taskId, apiKey);

    } catch (error) {
        console.error("Runway Service Error:", error);
        throw error;
    }
}