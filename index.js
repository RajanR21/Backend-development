import express from "express";
import path from 'path';
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


//how to connect to mongodb
mongoose.connect("mongodb://127.0.0.1:27017", {
    dbname: "backend",
}).then(c => console.log("connected")).catch(e => console.log("error"))

//created a schema
const message_schema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
})

//created model
const message = mongoose.model("Message", message_schema);

const app = express()
app.set('view engine', 'ejs');

//using middlewares
//app.use(express.static(path.join(path.resolve() , "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

//all the get routes are for when it renders for the first time 
app.get("/", async (req, res, next) => {
    //  res.render("login" , {name : "ra"})
    const { token } = req.cookies

    if (token) {
        const decoded = jwt.verify(token, "vuydwvysdvqvwwdvs");
        console.log(decoded._id);

        req.user = await message.findById(decoded._id);
        next()
    }
    else {
        res.render("login");
    }

}, (req, res) => {
    // console.log(req.user);

    res.render("logout", { name: req.user.name });
})

app.get("/login", (req, res) => {
    res.render("login");
})


app.get("/register", (req, res) => {
    res.render("register");
})


app.get("/logout", (req, res) => {

    res.cookie("token", null, {
        httpOnly: true,
        expires: new Date(Date.now()),
    });
    res.redirect("/")
})

//post routes are when some kind of submitting event is happening 
app.post("/login", async (req, res) => {
    let createdMessage = req.body;
    const {email, password } = req.body;
    let user_exist = await message.findOne({ email });

    if(user_exist == null)return res.redirect("register");

    let is_same_pass = await bcrypt.compare(password , user_exist.password);
    if (!is_same_pass) {
         res.render("login" , {name : "incorrect password"});
    }
    else {
        const token = jwt.sign({ _id: createdMessage._id }, "vuydwvysdvqvwwdvs");
        //  console.log(token);
    
        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 60 * 1000),
        });
    
        res.render("logout", { name: user_exist.name })
    }
    
})

app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    let user_exist = await message.findOne({ password });

    if (user_exist) {
        res.redirect("/login")
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await message.create({
        "name": req.body.name,
        "email": req.body.email,
        "password": hashedPassword,
    })

    res.redirect("/login")


})

app.listen(5000, () => {
    console.log("working app ");
})
