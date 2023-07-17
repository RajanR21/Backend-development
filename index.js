import express from "express";
import path from 'path';
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken"

//how to connect to mongodb
mongoose.connect("mongodb://127.0.0.1:27017", {
    dbname: "backend",
}).then(c => console.log("connected")).catch(e => console.log("error"))

//created a schema
const message_schema = new mongoose.Schema({
    name: String,
    email: String,
})

//created model
const message = mongoose.model("Message", message_schema);

const app = express()
app.set('view engine', 'ejs');

//let user = [];

//using middlewares
//app.use(express.static(path.join(path.resolve() , "public")));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

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
   
    res.render("logout" , {name : req.user.name});
})

app.post("/login", async (req, res) => {
    let createdMessage;
   const {name , email} = req.body;
    let user_exist = await message.findOne({email});

    if(user_exist == null){
         createdMessage = await message.create({
            "name": req.body.name,
            "email": req.body.email,
        })
    }
    else {
        return res.redirect("register");
    }
     
  //  console.log(req.body)
    
      const token = jwt.sign({ _id : createdMessage._id} , "vuydwvysdvqvwwdvs");
    //  console.log(token);
      
    res.cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 60 * 1000),
    });
    
    res.redirect("/")
})


app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/logout", (req, res) => {

    res.cookie("token", null, {
        httpOnly: true,
        expires: new Date(Date.now()),
    });
    res.redirect("/")
})

app.listen(5000, () => {
    console.log("working app ");
})
