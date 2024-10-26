# Book Note Taking App

## Overview
This project is a **Book Note Taking App** that allows users to manage their book collections, add and remove users, and take notes on individual books. The application provides an intuitive interface for users to upload book cover images and retrieve a unique URL for each image using AWS S3 for storage.

## Features
- **User Management**: Add, remove, and switch between users.
- **Book Management**: Upload books with cover images and take notes for each book.
- **Image Storage**: Store book cover images in AWS S3, ensuring a unique URL is generated each time an image is uploaded.
- **Category Filtering**: View books by categories.

## Technologies Used
- **Node.js**: The server-side JavaScript runtime.
- **Express**: A web framework for building web applications.
- **PostgreSQL**: A relational database for storing user and book data.
- **AWS S3**: For storing and retrieving book cover images.
- **Multer**: Middleware for handling file uploads.
- **Sharp**: For image processing (resizing).
- **Axios**: For making HTTP requests.

## Deployment

To deploy this project run

```bash
  npm start
```

## Screenshots

![App Screenshot](https://i.imgur.com/EnyitQw.png)

![App Screenshot](https://i.imgur.com/FF9uQnO.png)

## Authors

- [@YuvalFish](https://www.github.com/YuvalFish)