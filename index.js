import express from "express";
import pg from "pg";

const app = express();
const PORT = 3000;

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

let books = [
    {id: 1, name: 'Think And Grow Rich', author: 'Napoleon Hill', category_id: 2, cover_image: 'assets/think-and-grow-rich.jpg'},
    {id: 2, name: 'Think And Grow Rich', author: 'Napoleon Hill', category_id: 2, cover_image: 'assets/think-and-grow-rich.jpg'},
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

app.post("/add-book", (req, res) => {
    const user = req.body.id;

    res.render("new_book.ejs", 
        {
            user: user,
            categories: categories
        }
    );
});

app.post("/api/new-book", (req, res) => {
    console.log(req.body);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});