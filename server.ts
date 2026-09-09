const express = require('express');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const ai = new GoogleGenAI();

// Coordinates for the 11 Points of Interest (POIs) in Tuzla
const POI_DATABASE = {
    'trg_slobode': {
        name: 'Trg Slobode',
        lat: 44.5395175,
        lng: 18.6749037,
        prompt: 'Is this an image showing Freedom Square (Trg Slobode) in Tuzla with its central fountain or stone buildings? Answer only YES or NO.'
    },
    'salt_square': {
        name: 'Solni Trg',
        lat: 44.5382182,
        lng: 18.6759398,
        prompt: 'Is this an image showing Salt Square (Solni trg) in Tuzla with the archaeological salt well monument? Answer only YES or NO.'
    },
    'palancinkara': {
        name: 'Palačinkara Bagi',
        lat: 44.5383762,
        lng: 18.6775339,
        prompt: 'Is this an image showing Pancake Bagi or food establishment in Tuzla old town? Answer only YES or NO.'
    },
    'slana_banja': {
        name: 'Slana Banja Park',
        lat: 44.5378167,
        lng: 18.6875664,
        prompt: 'Is this an image showing Slana Banja memorial park or walking promenade in Tuzla? Answer only YES or NO.'
    },
    'kapija': {
        name: 'Kapija',
        lat: 44.5388,
        lng: 18.6762,
        prompt: 'Is this an image showing the Kapija gate area or pedestrian entrance in Tuzla old town? Answer only YES or NO.'
    },
    'slapovi': {
        name: 'Panonika Waterfalls',
        lat: 44.5404243,
        lng: 18.6819408,
        prompt: 'Is this an image showing the cascade waterfalls (slapovi) at Panonika in Tuzla? Answer only YES or NO.'
    },
    'ismet': {
        name: 'Ismet Mujezinović Statue',
        lat: 44.5375,
        lng: 18.6805,
        prompt: 'Is this an image showing the statue of painter Ismet Mujezinović in Tuzla? Answer only YES or NO.'
    },
    'atelje_ismet': {
        name: 'Atelje Ismet Mujezinović',
        lat: 44.5371465,
        lng: 18.6810454,
        prompt: 'Is this an image showing the gallery studio house Atelje Ismet Mujezinović in Tuzla? Answer only YES or NO.'
    },
    'bingo_city_centar': {
        name: 'Bingo City Center',
        lat: 44.532177,
        lng: 18.651743,
        prompt: 'Is this an image showing Bingo City Center shopping mall facade in Tuzla? Answer only YES or NO.'
    },
    'mesa_selimovic': {
        name: 'Meša Selimović Statue',
        lat: 44.5370993,
        lng: 18.6781216,
        prompt: 'Is this an image showing the statue of writer Meša Selimović in Tuzla? Answer only YES or NO.'
    },
    'tvrtko_park': {
        name: 'King Tvrtko I Park',
        lat: 44.5380826,
        lng: 18.6783327,
        prompt: 'Is this an image showing the statue of King Tvrtko I Kotromanić in Central Park Tuzla? Answer only YES or NO.'
    }
};

// Calculate distance between two GPS coordinates in meters (Haversine formula)
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

app.post('/verify-poi', upload.single('image'), async (req, res) => {
    try {
        const { poiId, userLat, userLng } = req.body;
        const poi = POI_DATABASE[poiId];

        if (!poi) {
            return res.status(400).json({ success: false, error: 'Invalid POI ID' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Image file required' });
        }

        // Step 1: GPS Distance Check (within 25 meters threshold)
        const distance = calculateDistanceMeters(
            parseFloat(userLat),
            parseFloat(userLng),
            poi.lat,
            poi.lng
        );

        if (distance > 25) {
            return res.status(200).json({
                success: false,
                reason: 'GPS_TOO_FAR',
                message: `You are ${Math.round(distance)} meters away. Get within 25 meters of ${poi.name}.`
            });
        }

        // Step 2: Vision AI Landmark Verification
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: req.file.mimetype,
                        data: req.file.buffer.toString('base64')
                    }
                },
                poi.prompt
            ]
        });

        const aiAnswer = response.text ? response.text.trim().toUpperCase() : '';
        const isMatched = aiAnswer.includes('YES');

        if (isMatched) {
            return res.status(200).json({
                success: true,
                rewardUnlocked: true,
                poi: poi.name,
                message: `Verification successful! Reward unlocked for ${poi.name}.`
            });
        } else {
            return res.status(200).json({
                success: false,
                reason: 'IMAGE_NOT_RECOGNIZED',
                message: `Photo does not match ${poi.name}. Please frame the object clearly.`
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.listen(3000, () => console.log('POI Verification Service running on port 3000'));