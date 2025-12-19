// src/services/runwayService.js

// NOTE: We use the proxy path defined in vite.config.js
const API_BASE = "/runway-api";
const RUNWAY_VERSION = "2024-11-06";

// --- HELPER 1: Image Processing ---
const resizeAndConvertImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        // Handle CORS for remote images
        if (url.startsWith('http')) {
            img.crossOrigin = "Anonymous";
        }

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Limit max size to 1536 for best quality/performance balance
            const MAX_SIZE = 1536;

            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Clean slate
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            resolve({
                base64: canvas.toDataURL('image/jpeg', 0.95),
                width: width,
                height: height
            });
        };
        img.onerror = () => reject("Could not load image");

        // Cache busting for remote URLs to prevent canvas tainting
        if (url.startsWith('http')) {
            img.src = `${url}?t=${new Date().getTime()}`;
        } else {
            img.src = url;
        }
    });
};

// --- HELPER 2: Ratio Selection ---
const getBestRatio = (width, height) => {
    const aspect = width / height;
    // Gemini supported ratios
    if (aspect > 1.25) {
        return "1344:768"; // Landscape
    } else if (aspect < 0.8) {
        return "768:1344"; // Portrait
    } else {
        return "1024:1024"; // Square
    }
};

// --- HELPER 3: API Calls ---
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
            ratio: targetRatio,
            promptText: prompt.substring(0, 999), // Safety limit
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

// --- MAIN FUNCTION ---
export async function performVirtualTryOn(baseImage, jewelryItem, apiKey) {
    try {
        console.log("Step 1: Analyzing Image Dimensions...");

        // Process images
        const userImgData = await resizeAndConvertImage(baseImage);
        const itemImgData = await resizeAndConvertImage(jewelryItem.src);

        // Calculate dynamic ratio
        const dynamicRatio = getBestRatio(userImgData.width, userImgData.height);
        console.log(`Detected Ratio: ${userImgData.width}x${userImgData.height} -> Using ${dynamicRatio}`);

        let prompt;

        // --- PROMPT LOGIC SWITCHER ---

        if (jewelryItem.type === 'clothing') {
            // 1. CLOTHING (SAREE/DRESS)
            prompt = `
            Task: High-Fidelity Garment Transfer (Saree/Dress).
            Input 1: Customer (Model).
            Input 2: Garment (Product - Saree and Blouse).
            
            FRAMING: Maintain exact aspect ratio. Do not crop.
            
            INSTRUCTIONS:
            1. Texture Map: Wrap the EXACT fabric and pattern from Input 2 onto the Model. This includes the **Saree** and the **Blouse**.
            2. Pose Lock: The Model's body pose, hand position, and head angle MUST be preserved from Input 1.
            3. Identity Lock: Keep the Model's face, skin tone, hair, and background 100% identical.
            
            REALISM & FIDELITY:
            - Photographic quality: Ultra-realistic, high-resolution, sharp focus, professional studio lighting.
            - Seamless integration: The new garment (Saree and Blouse) must be perfectly blended, matching the original's lighting, shadow, and color temperature.
            - Material accuracy: Ensure natural fabric folds, drapes, and wrinkles that correspond to the Model's pose and body shape. For Saree, ensure the pallu drapes naturally over the shoulder and arm.
            `;

        } else if (jewelryItem.type === 'eyewear') {
            // 2. EYEWEAR (TITAN GLASSES)
            prompt = `
            Task: Technical Photo Composite (Eyewear Virtual Try-On).
            Input 1: Customer (Face).
            Input 2: Eyewear Product (Glasses/Sunglasses).

            CRITICAL CLEANUP:
            - If the Customer is already wearing glasses, ERASE THEM completely and reconstruct the eyes/bridge of the nose.

            PLACEMENT INSTRUCTIONS:
            1. BRIDGE: Place the bridge of the glasses exactly on the bridge of the Customer's nose.
            2. EARS: The arms (temples) of the glasses must go OVER the ears, not through the head.
            3. ALIGNMENT: Align the frame horizontally with the eyes.

            STRICT RULES:
            1. IDENTITY: Keep the Customer's face, skin tone, and hair 100% IDENTICAL.
            2. PRODUCT: Use the EXACT design from Input 2 (Frame shape, color, and lens color).
            3. TRANSPARENCY: 
               - If Input 2 has clear lenses, Customer's eyes MUST be visible.
               - If Input 2 has dark lenses, eyes should be hidden/faint.

            REALISM & FIDELITY:
            - Photographic quality: Ultra-realistic, high-resolution, sharp focus, professional studio lighting.
            - Seamless integration: The eyewear must be perfectly blended, matching the original's lighting, shadow, and color temperature.
            - Material accuracy: Ensure realistic reflections, specular highlights, and high-polish metal sheen on the frame. Cast realistic, soft shadows onto the skin.
            - Fit: Ensure the fit looks natural.
            `;

        } else if (jewelryItem.type === 'custom_combo') {
            // 3. MIX & MATCH (NECKLACE + EARRING)
            prompt = `
            Task: Technical Photo Composite (Multi-Item Mix & Match).
            Input 1: Customer.
            Input 2: Combined Jewelry Reference (Contains separate Necklace AND Earrings).

            CRITICAL ANALYSIS:
            - Input 2 contains two separate items merged side-by-side.
            - Identify the Necklace object. Identify the Earring objects.

            CRITICAL CLEANUP:
            - Erase ALL existing jewelry from the Customer (Neck and Ears).
            - Restore skin texture before placing new items.

            PLACEMENT INSTRUCTIONS:
            1. NECKLACE: Take the necklace from Input 2. Place it on the Customer's upper chest/sternum.
            2. EARRINGS: Take the earrings from Input 2.Hang them from the Customer's earlobes. Ensure the earrings are sized realistically to the customer's head and face, maintaining proper proportion. 


            STRICT RULES:
            - IDENTITY: Keep Customer's face 100% identical.
            - DESIGN: Copy pixel-for-pixel from Input 2.
            - COLOR LOCK: Do not change stone colors.
            `;

        } else if (jewelryItem.type === 'set') {
            // 4. JEWELRY SETS
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
            // 5. SINGLE JEWELRY (NECKLACE / EARRING)
            const typeName = jewelryItem.type === 'earring' ? 'Earrings' : 'Necklace';
            const targetArea = jewelryItem.type === 'earring' ? 'ears' : 'neck';

            let pos;
            if (jewelryItem.type === 'necklace') {
                pos = "The necklace must rest naturally on the skin of the upper chest/sternum. Show the full length of the chain. Do not crop.";
            } else {
                pos = "Earrings must be attached precisely to the center of each earlobe piercing, hanging straight downward with natural gravity, scaled proportionally to the model’s ear and face (no oversized or floating appearance).";
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
        const taskId = await startImageGeneration(prompt, [userImgData.base64, itemImgData.base64], apiKey, dynamicRatio);

        console.log(`Step 3: Polling Task ID: ${taskId}`);
        return await pollTask(taskId, apiKey);

    } catch (error) {
        console.error("Runway Service Error:", error);
        throw error;
    }
}

// Named exports for compatibility if components import specific names
export const performJewelryTryOn = performVirtualTryOn;
export const performApparelTryOn = performVirtualTryOn;
export const performEyewearTryOn = performVirtualTryOn;