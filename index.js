import express from "express";
import path from 'path';
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import bodyParser from 'body-parser';
import multer from "multer";
import fs from "fs";

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Mongoose connection
mongoose.connect("mongodb://127.0.0.1:27017/backend", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch(error => console.error("MongoDB connection error:", error));

// Define a schema for storing messages
const messageSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
});

const Message = mongoose.model("Message", messageSchema);

// Define a schema for storing images
const imgSchema = new mongoose.Schema({
    name: String,
    desc: String,
    img: {
        data: Buffer,
        contentType: String
    }
});

const ImgModel = mongoose.model("Image", imgSchema);

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", async (req, res, next) => {
    const { token } = req.cookies

    if (token) {
        const decoded = jwt.verify(token, "vuydwvysdvqvwwdvs");
        console.log(decoded._id);

        req.user = await Message.findById(decoded._id);
        next();
    }
    else {
        res.render("login");
    }
}, (req, res) => {
    res.render("logout", { name: req.user.name });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/logout", (req, res) => {
    res.cookie("token", null, {
        httpOnly: true,
        expires: new Date(Date.now()),
    });
    res.redirect("/");
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    let userExist = await Message.findOne({ email });

    if (!userExist) return res.render("login", { name: "User not found" });

    let isSamePass = await bcrypt.compare(password, userExist.password);

    if (!isSamePass) {
        return res.render("login", { name: "Incorrect password" });
    } else {
        const token = jwt.sign({ _id: userExist._id }, "vuydwvysdvqvwwdvs");
        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 60 * 1000),
        });
        res.render("logout", { name: userExist.name });
    }
});

app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    let userExist = await Message.findOne({ email });

    if (userExist) {
        return res.redirect("/login");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Message.create({
        "name": name,
        "email": email,
        "password": hashedPassword,
    });

    res.redirect("/login");
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now());
    }
});

var upload = multer({ storage: storage });

app.get('/image', (req, res) => {
    ImgModel.find({})
        .then((data, err) => {
            if (err) {
                console.log(err);
            }
            res.render('imagepage', { items: data });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Internal Server Error");
        });
});

app.post('/image', upload.single('image'), (req, res) => {
    var obj = {
        name: req.body.name,
        desc: req.body.desc,
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        }
    };

    ImgModel.create(obj)
        .then(() => {
            res.redirect('/image');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Internal Server Error");
        });
});

app.listen(5000, err => {
    if (err)
        throw err;
    console.log('Server listening on port', 5000);
});
