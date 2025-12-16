// src/utils/imageMerger.js

export const mergeImages = async (imgUrl1, imgUrl2) => {
    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = src;
        });
    };

    try {
        const [img1, img2] = await Promise.all([loadImage(imgUrl1), loadImage(imgUrl2)]);

        // Create a canvas large enough to hold both side-by-side
        const canvas = document.createElement('canvas');
        const gap = 50; // Space between items

        const width = img1.width + img2.width + gap;
        const height = Math.max(img1.height, img2.height);

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        // White background helps the AI distinguish items cleanly
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img1, 0, 0);
        ctx.drawImage(img2, img1.width + gap, 0);

        return canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
        console.error("Error merging images:", error);
        throw error;
    }
};