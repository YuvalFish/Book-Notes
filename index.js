import express from "express";
import pg from "pg";
import multer from "multer";
import crypto from 'crypto';
import dotenv from 'dotenv';
import sharp from 'sharp';

// aws-sdk
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl, S3RequestPresigner } from "@aws-sdk/s3-request-presigner";

// Get dirname
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
app.use(express.static(__dirname + "/public"));

// Connects to the database
const db = new pg.Client({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
});
db.connect();

let categories = null;

let current_user = 1;
let upload_error = null;
let category = 0;

let users = [
    {id: 1, name: 'Yuval'},
    {id: 2, name: 'Someone'},
    {id: 3, name: 'Another Guy'}
];

// Gets the categories if not already
async function getCategories() {
    if (categories == null) {
        const result = await db.query("SELECT * FROM categories;")
        categories = result.rows;
    }
}

// Given a book id returns the current user notes on that book
async function getUserNotes(book_id) {
    const result = await db.query("SELECT * FROM notes WHERE user_id = $1 AND book_id = $2 ORDER BY id DESC;", [current_user, book_id]);

    return result.rows;
}

async function getBooks() {
    let result = null;
    // Gets all the books the current user has uploaded
    if (category == 0) {
        result = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY created_at DESC;", [current_user]);
    }
    // Gets all the books the current user has uploaded with the desired category 
    else {
        result = await db.query("SELECT * FROM books WHERE user_id = $1 AND category_id = $2 ORDER BY created_at DESC;", [current_user, category]);
    }

    // Foreach book fetch the temp image cover url from AWS S3 and update it in the database
    for (const book of result.rows) {
        const currentTime = new Date();

        // Check if temp URL is expired or not set
        if (!book.temp_cover_url || !book.temp_url_expires_at || new Date(book.temp_url_expires_at) < currentTime) {
            const getObjectParams = {
                Bucket: bucketName,
                Key: book.cover_image,
            };
            const command = new GetObjectCommand(getObjectParams);
            const expiresIn = 3600;
            const url = await getSignedUrl(s3, command, { expiresIn: expiresIn });

            // Calculate expiration timestamp
            const expirationTime = new Date(currentTime.getTime() + expiresIn * 1000).toISOString();

            // Update the temp_cover_url and temp_url_expires_at in the database
            await db.query(
                "UPDATE books SET temp_cover_url = $1, temp_url_expires_at = $2 WHERE id = $3;",
                [url, expirationTime, book.id]
            );

            // Update in memory result
            book.temp_cover_url = url;
            book.temp_url_expires_at = expirationTime;
        }
    }

    return result.rows;
}

// Basic security measures to ensure the user won't upload a malicious file / a file which is not an image
function imageInputValidation(image) {

    // checks the file extension - can be spoffed easily
    const extensions = image.originalname.split('.');
    const file_extension = extensions[extensions.length - 1].toLowerCase();

    if (file_extension != 'jpg' && file_extension != 'png') {
        return "Invalid file upload. Please ensure the file is a valid image (JPEG or PNG) and meets the size requirements.";
    }

    // check the MIME type - can be spoffed easily
    if (image.mimetype != 'image/jpeg' && image.mimetype != 'image/png') {
        return "Invalid file upload. Please ensure the file is a valid image (JPEG or PNG) and meets the size requirements.";
    }

    // limit file size to be under 1mb
    if (image.size > 1024*1024 ) {
        return "File size is too large. Please upload an image smaller than 1MB.";
    }

    return null;
}

app.get("/", async (req, res) => {

    const books = await getBooks();
    await getCategories();
    
    // Renders the home page
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

    // Reset error message
    let error = upload_error;
    upload_error = null;

    res.render("new_book.ejs", 
        {
            user: current_user,
            categories: categories,
            error: error
        }
    );
});

// POST endpoint to create a new book for a user
app.post("/api/new-book", upload.single('cover-image') ,async (req, res) => {
    // console.log(req.body);
    // console.log(req.file);
    const data = req.body;

    // if the image is not valid return the page with the error message
    const imageValidation = imageInputValidation(req.file);
    if (imageValidation !== null) {
        upload_error = imageValidation;
        return res.redirect("/add-book");
    }

    // Resize image
    const buffer = await sharp(req.file.buffer).resize({width: 700, height: 1000, fit: "cover"}).toBuffer();
    
    // Sets a random image name
    const imageName = randomImageName();
    const params = {
        Bucket: bucketName,
        Key: imageName,
        Body: buffer,
        ContentType: req.file.mimetype,
    };

    // Uploads the image to s3
    const command = new PutObjectCommand(params);
    await s3.send(command);

    try {
        await db.query("INSERT INTO books (name, author, category_id, cover_image, user_id) VALUES ($1,$2,$3,$4,$5);", [data.book_name, data.author_name, data.category, imageName, data.user_id]);
    } catch (error) {
        console.log(error);
    }

    res.redirect("/");
});

// changes the desired category
app.post("/category", async (req, res) => {
    
    category = req.body.id;

    res.redirect("/");
});

app.get("/book/:id", async (req, res) => {

    // Gets the book
    const books = await getBooks();
    const book = books.find((book) => book.cover_image == req.params.id);

    const notes = await getUserNotes(book.id);

    res.render("book.ejs", { 
        book: book,
        notes: notes 
    });
});

app.post("/api/add-note", async (req, res) => {
    await db.query("INSERT INTO notes (content, user_id, book_id) VALUES ($1,$2,$3);", [' ', current_user, req.body.book_id]);

    res.redirect(`/book/${req.body.book_cover_name}`);
});

app.post("/api/delete-note", async (req, res) => {
    await db.query("DELETE FROM notes WHERE id = $1;", [req.body.note_id]);

    res.redirect(`/book/${req.body.book_cover_name}`);
});

app.post("/api/update-note", async (req,res) => {
    await db.query("UPDATE notes SET content = $1 WHERE id = $2", [req.body.note_content, req.body.note_id]);

    res.redirect(`/book/${req.body.book_cover_name}`);
});

app.post("/api/delete-book/:cover", async (req,res) => {

    console.log(req.body);
    console.log(req.params);

    // Deletes the image from S3
    const params = {
        Bucket: bucketName,
        Key: req.params.cover
    };

    const command = new DeleteObjectCommand(params);
    await s3.send(command);

    // Deletes the book from the database
    await db.query("DELETE FROM books WHERE id = $1;", [req.body.book_id]);

    res.redirect("/");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});