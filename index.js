import express from "express";
import pg from "pg";

const app = express();
const PORT = 3000;

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

app.get("/", async (req, res) => {
    res.render("index.ejs");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});