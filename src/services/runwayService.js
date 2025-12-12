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
            // --- SWITCHED TO GEMINI MODEL ---
            model: "gemini_2.5_flash",

            // Gemini works best with Square ratio for consistency
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
        console.log("Step 1: Preparing Images for Gemini...");
        const baseUri = await resizeAndConvertImage(baseImage);
        const jewelryUri = await resizeAndConvertImage(jewelryItem.src);

        let prompt;

        // Gemini prefers "Role Playing" and "Natural Language" instructions
        if (jewelryItem.type === 'clothing') {
            // --- CLOTHING PROMPT ---
            prompt = `
          Act as a professional photo editor.
          Task: Replace the outfit on the person in Image 1 with the outfit in Image 2.
          
          Instructions:
          1. Remove the current clothes completely.
          2. Fit the new outfit naturally onto the person's body.
          3. STRICTLY preserve the face, hair, and skin tone. Do not retouch the face.
          4. Ensure the background remains unchanged.
        `;
        } else {
            // --- JEWELRY PROMPT (With Removal Logic) ---
            const typeName = jewelryItem.type === 'earring' ? 'Earrings' : 'Necklace';
            const targetArea = jewelryItem.type === 'earring' ? 'ears' : 'neck';

            let pos;
            if (jewelryItem.type === 'necklace') {
                pos = "The necklace must rest naturally on the skin of the upper chest/sternum. Show the full length of the chain. Do not crop it.";
            } else {
                pos = "The earrings must hang vertically from the earlobes.";
            }

            prompt = `
          Act as a professional jewelry retoucher.
          Task: Virtual Try-On.
          
          Input 1: Customer Photo.
          Input 2: ${typeName} Product.
          
          CRITICAL STEP - CLEANUP:
          If the customer is already wearing any jewelry on their ${targetArea}, REMOVE IT FIRST. Erase the old jewelry and reconstruct the skin texture underneath.
          
          EXECUTION:
          1. Place the new ${typeName} (Input 2) onto the customer.
          2. Placement: ${pos}
          3. Identity: Keep the customer's face 100% identical.
          4. Product: Use the exact design from Input 2.
          5. Physics: Apply natural gravity and shadows.
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