import express from "express";
import pg from "pg";
import multer from "multer";
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config();

// Generates a random image name to remove overwrites and improve security
const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
    credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretAccessKey
    },
    region: bucketRegion
});

const app = express();
const PORT = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

let books = [
    {id: 1, name: 'Think And Grow Rich', author: 'Napoleon Hill', category_id: 2, cover_image: 'assets/think-and-grow-rich.jpg'},
    {id: 2, name: 'Think And Grow Rich', author: 'Napoleon Hill', category_id: 2, cover_image: 'assets/f82f272c2fbd8a054becf267bcb875e65343d1be389d51eb87fef71380b850e3.jpeg'},
];

let categories = [
    {id: 2, name: 'Finance'},
    {id: 3, name: 'Personal Development'},
    {id: 4, name: 'Business'}
];

let current_user = 1;

let users = [
    {id: 1, name: 'Yuval'},
    {id: 2, name: 'Someone'},
    {id: 3, name: 'Another Guy'}
];

app.get("/", async (req, res) => {
    res.render("index.ejs", 
        {
            books: books,
            categories: categories,
            current_user: users.find((user) => user.id === current_user),
            users: users
        }
    );
});

app.get("/add-book", (req, res) => {
    console.log('current_user',current_user);

    res.render("new_book.ejs", 
        {
            user: current_user,
            categories: categories
        }
    );
});

app.post("/api/new-book", upload.single('cover-image') ,async (req, res) => {
    // console.log(req.body);
    // console.log(req.file);

    // Resize image
    const buffer = await sharp(req.file.buffer).resize({width: 700, height: 1000, fit: "cover"}).toBuffer();
    
    const params = {
        Bucket: bucketName,
        Key: randomImageName(),
        Body: buffer,
        ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    res.redirect("/");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});