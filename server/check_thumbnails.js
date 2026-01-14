const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Build path to .env
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const NewspaperSchema = new mongoose.Schema({
    title: String,
    coverImageUrl: String
}, { timestamps: true });

const Newspaper = mongoose.model('Newspaper', NewspaperSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const papers = await Newspaper.find({}, 'title coverImageUrl createdAt').sort({ createdAt: -1 }).limit(10);

        papers.forEach(p => {
            console.log(`Title: ${p.title} | Has Image: ${!!p.coverImageUrl} | Image Length: ${p.coverImageUrl ? p.coverImageUrl.length : 0}`);
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
