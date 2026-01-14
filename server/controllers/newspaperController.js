const Newspaper = require('../models/Newspaper');
const fs = require('fs');

// @desc    Upload a new newspaper
// @route   POST /api/admin/newspaper/upload
// @access  Private/Admin
const uploadNewspaper = async (req, res) => {
    try {
        const { title, description, date, pdfData } = req.body;

        if (!pdfData) {
            return res.status(400).json({ message: 'No PDF data provided' });
        }

        const newspaper = new Newspaper({
            title,
            description,
            date,
            pdfUrl: pdfData, // Storing Base64 string directly in pdfUrl
            uploadedBy: req.user._id,
            mappedAreas: [],
        });

        const createdNewspaper = await newspaper.save();
        res.status(201).json(createdNewspaper);
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all newspapers (Admin)
// @route   GET /api/admin/newspapers
// @access  Private/Admin
const getAdminNewspapers = async (req, res) => {
    try {
        const newspapers = await Newspaper.find({}).sort({ date: -1 });
        res.json(newspapers);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all published newspapers (User)
// @route   GET /api/user/newspapers
// @access  Public
const getNewspapers = async (req, res) => {
    try {
        // Only fetch fields needed for gallery to reduce payload size if PDFs are large
        const newspapers = await Newspaper.find({ isPublished: true })
            .select('-pdfUrl -mappedAreas')
            .sort({ date: -1 });

        res.json({ newspapers });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get newspaper by ID
// @route   GET /api/user/newspaper/:id
// @access  Public/Private
const getNewspaperById = async (req, res) => {
    try {
        const newspaper = await Newspaper.findById(req.params.id);
        if (newspaper) {
            console.log(`[SERVER] Fetching newspaper: ${newspaper.title}`);
            newspaper.mappedAreas.forEach(area => {
                console.log(` - Area "${area.headline}" image size: ${area.extractedImageUrl ? area.extractedImageUrl.length : 0} bytes`);
            });
            res.json(newspaper);
        } else {
            res.status(404).json({ message: 'Newspaper not found' });
        }
    } catch (error) {
        console.error("[SERVER] Fetch Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add mapped area to newspaper
// @route   POST /api/admin/newspaper/:id/map-area
// @access  Private/Admin
const addMappedArea = async (req, res) => {
    try {
        const { pageNumber, x, y, width, height, headline, category, imageData } = req.body;
        console.log("Mapping Area Request Received:", { headline, category, hasImage: !!imageData });

        const newspaper = await Newspaper.findById(req.params.id);

        if (!newspaper) {
            return res.status(404).json({ message: 'Newspaper not found' });
        }

        const newArea = {
            pageNumber,
            coordinates: { x, y, width, height },
            headline,
            category,
            extractedImageUrl: imageData || '', // Base64 string from frontend
        };

        newspaper.mappedAreas.push(newArea);
        await newspaper.save();

        console.log(`[SERVER] Saved area for "${headline}". Image size: ${imageData ? imageData.length : 0} bytes`);

        res.status(201).json(newspaper.mappedAreas);
    } catch (error) {
        console.error("[SERVER] Add Mapped Area Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Toggle publish status
// @route   PUT /api/admin/newspaper/:id/publish
// @access  Private/Admin
const togglePublish = async (req, res) => {
    try {
        const newspaper = await Newspaper.findById(req.params.id);
        if (newspaper) {
            newspaper.isPublished = !newspaper.isPublished;
            if (newspaper.isPublished) {
                newspaper.publishedAt = Date.now();
            }
            await newspaper.save();
            res.json(newspaper);
        } else {
            res.status(404).json({ message: 'Newspaper not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete newspaper
// @route   DELETE /api/admin/newspaper/:id
// @access  Private/Admin
const deleteNewspaper = async (req, res) => {
    try {
        const newspaper = await Newspaper.findById(req.params.id);
        if (newspaper) {
            await newspaper.deleteOne();
            res.json({ message: 'Newspaper removed' });
        } else {
            res.status(404).json({ message: 'Newspaper not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Increment View Count
// @route   GET /api/user/newspaper/:id/view
// @access  Public
const incrementViewCount = async (req, res) => {
    try {
        const newspaper = await Newspaper.findById(req.params.id);
        if (newspaper) {
            newspaper.viewCount = (newspaper.viewCount || 0) + 1;
            await newspaper.save();
            res.status(200).json({ message: 'View count incremented' });
        } else {
            res.status(404).json({ message: 'Newspaper not found' });
        }
    } catch (error) {
        // Silent fail for view counts
        res.status(500).send();
    }
};

module.exports = {
    uploadNewspaper,
    getAdminNewspapers,
    getNewspapers,
    getNewspaperById,
    addMappedArea,
    togglePublish,
    deleteNewspaper,
    incrementViewCount,

};
