// src/services/runwayService.js

// NOTE: We use the proxy path defined in vite.config.js
const API_BASE = "/runway-api";
const RUNWAY_VERSION = "2024-11-06";

// Updated to return Dimensions + Base64
const resizeAndConvertImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Limit max size to 1536 to keep quality high but within API limits
            const MAX_SIZE = 1536;

            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            resolve({
                base64: canvas.toDataURL('image/jpeg', 0.95),
                width: width,
                height: height
            });
        };
        img.onerror = () => reject("Could not load image");
        img.src = url;
    });
};

// Helper to pick the best allowed ratio
const getBestRatio = (width, height) => {
    const aspect = width / height;

    // Logic: Map the user's aspect ratio to the closest valid Runway option
    if (aspect > 1.25) {
        return "1344:768"; // Landscape
    } else if (aspect < 0.8) {
        return "768:1344"; // Portrait (Phone Mode)
    } else {
        return "1024:1024"; // Square (Default)
    }
};

async function startImageGeneration(prompt, imageUris, apiKey, targetRatio) {
    const response = await fetch(`${API_BASE}/v1/text_to_image`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "X-Runway-Version": RUNWAY_VERSION,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gemini_2.5_flash",

            // DYNAMIC RATIO HERE
            ratio: targetRatio,

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
        console.log("Step 1: Analyzing Image Dimensions...");

        // Get dimensions of the USER image to determine ratio
        const userImgData = await resizeAndConvertImage(baseImage);
        const itemImgData = await resizeAndConvertImage(jewelryItem.src);

        // Calculate dynamic ratio
        const dynamicRatio = getBestRatio(userImgData.width, userImgData.height);
        console.log(`Detected Ratio: ${userImgData.width}x${userImgData.height} -> Using ${dynamicRatio}`);

        let prompt;

        if (jewelryItem.type === 'clothing') {
            prompt = `
        Task: High-Fidelity Garment Transfer.
        Input 1: Model (Customer).
        Input 2: Garment (Product).
        
        FRAMING: Maintain exact aspect ratio. Do not crop.
        
        INSTRUCTIONS:
        1. Texture Map: Wrap the EXACT fabric and pattern from Input 2 onto the Model.
        2. Identity: Keep the Model's face, body, and background 100% identical.
        
        REALISM & FIDELITY:
        - Photographic quality: Ultra-realistic, high-resolution, sharp focus, professional studio lighting.
        - Seamless integration: The new garment must be perfectly blended, matching the original's lighting, shadow, and color temperature.
        - Material accuracy: Ensure natural fabric folds, drapes, and wrinkles that correspond to the Model's pose and body shape.
        `;

        } else if (jewelryItem.type === 'set') {
            prompt = `
        Task: Technical Photo Composite (Jewelry Set).
        Input 1: Customer.
        Input 2: Jewelry Set (Product).

        FRAMING:
        - DO NOT CROP. Maintain full view of chest/shoulders.

        CRITICAL CLEANUP:
        - If Customer is wearing OLD jewelry, ERASE IT completely and cleanly.

        STRICT RULES:
        1. NO NEW GEMS: Use ONLY the design, cut, and material from Input 2.
        2. COLOR LOCK: Do not change stone or metal colors.
        3. IDENTITY: Keep face, skin tone, hair, and background 100% identical.

        PLACEMENT:
        - Necklace: Rest naturally on the upper chest/sternum. Show full length.
        - Earrings: Hang vertically from the earlobes.
        
        REALISM & FIDELITY:
        - Photographic quality: Ultra-realistic, high-resolution, sharp focus, professional studio lighting.
        - Seamless integration: The jewelry must be perfectly blended, matching the original's lighting, shadow, and color temperature.
        - Material accuracy: Ensure realistic reflections, specular highlights, and metal sheen on the jewelry. Cast realistic, soft shadows onto the skin.
        `;

        } else {
            const typeName = jewelryItem.type === 'earring' ? 'Earrings' : 'Necklace';
            const targetArea = jewelryItem.type === 'earring' ? 'ears' : 'neck';

            let pos;
            if (jewelryItem.type === 'necklace') {
                pos = "The necklace must rest naturally on the skin of the upper chest/sternum. Show the full length of the chain. Do not crop.";
            } else {
                pos = "The earrings must hang vertically from the earlobes.";
            }

            prompt = `
        Task: Technical Photo Composite (${typeName}).
        Input 1: Customer.
        Input 2: ${typeName} (Product).
        
        FRAMING RULE: 
        - KEEP ORIGINAL ASPECT RATIO. 
        - DO NOT CROP THE BOTTOM. 
        
        CRITICAL CLEANUP:
        - Remove any existing jewelry on ${targetArea} completely and cleanly.
        
        STRICT RULES:
        1. NO NEW GEMS: Use ONLY the design, cut, and material from Input 2.
        2. IDENTITY: Keep face, skin tone, hair, and background 100% identical.
        3. PLACEMENT: ${pos}
        
        REALISM & FIDELITY:
        - Photographic quality: Ultra-realistic, high-resolution, sharp focus, professional studio lighting.
        - Seamless integration: The jewelry must be perfectly blended, matching the original's lighting, shadow, and color temperature.
        - Material accuracy: Ensure realistic reflections, specular highlights, and metal sheen on the jewelry. Cast realistic, soft shadows onto the skin.
        `;
        }

        console.log("Step 2: Starting Runway Task...");
        // Pass the calculated ratio
        const taskId = await startImageGeneration(prompt, [userImgData.base64, itemImgData.base64], apiKey, dynamicRatio);

        console.log(`Step 3: Polling Task ID: ${taskId}`);
        return await pollTask(taskId, apiKey);

    } catch (error) {
        console.error("Runway Service Error:", error);
        throw error;
    }
}
