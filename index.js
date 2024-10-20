import express from "express";
import pg from "pg";
import multer from "multer";
import crypto from 'crypto';

// aws-sdk
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl, S3RequestPresigner } from "@aws-sdk/s3-request-presigner";

import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config();

// Generates a random image name to remove overwrites and improve security
const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

// AWS S3 bucket information
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

// Used to save the uploaded image in the memory before resizing it and submitting to s3
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middlewares
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

// Connects to the database
const db = new pg.Client({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
});
db.connect();

let categories = [
    {id: 1, name: 'Finance'},
    {id: 2, name: 'Personal Development'},
    {id: 3, name: 'Business'}
];

let current_user = 1;

let users = [
    {id: 1, name: 'Yuval'},
    {id: 2, name: 'Someone'},
    {id: 3, name: 'Another Guy'}
];

async function getCoverImageUrl() {
    // Gets all the books the current user has uploaded
    const result = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY created_at DESC", [current_user]);

    // Foreach book fetch the temp image cover url from AWS S3 and update it in the database
    for (const book of result.rows) {
        const getObjectParams = {
            Bucket: bucketName,
            Key: book.cover_image,
        };
        const command = new GetObjectCommand(getObjectParams);
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

        await db.query("UPDATE books SET temp_cover_url = $1 WHERE id = $2;", [url, book.id]);
    }
}

app.get("/", async (req, res) => {
    
    // TODO: only get a new url when the last one expires
    getCoverImageUrl();

    // Gets all the books the current user has uploaded
    const result = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY created_at DESC", [current_user]);
    
    // Renders the home page
    res.render("index.ejs", 
        {
            books: result.rows,
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
    console.log(req.body);
    // console.log(req.file);
    const data = req.body;

    // Resize image
    const buffer = await sharp(req.file.buffer).resize({width: 700, height: 1000, fit: "cover"}).toBuffer();
    
    const imageName = randomImageName();
    const params = {
        Bucket: bucketName,
        Key: imageName,
        Body: buffer,
        ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    try {
        await db.query("INSERT INTO books (name, author, category_id, cover_image, user_id) VALUES ($1,$2,$3,$4,$5);", [data.book_name, data.author_name, data.category, imageName, data.user_id]);
    } catch (error) {
        console.log(error);
    }

    res.redirect("/");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});