const express = require('express')
const ejs = require('ejs')
const {pool} = require('./config/db')
const bcrypt = require('bcrypt')
const dotenv = require('dotenv')
const path  = require('path')
require('dotenv').config({path:path.resolve(__dirname+'/config/.env')})
const session = require('express-session')
// const flash = require('express-flash')
const pgSession = require('connect-pg-simple')(session);
const multer = require('multer')
const { read } = require('fs')
const { type } = require('os')
const { Client } = require('pg')


const ensureAuth = (req,res,next)=>{
    if(req.session.isAuth){
        next();
    }else{
        res.redirect('/userlogin')
    }
}

const ensureGuest = (req,res,next)=>{
    if(req.session.isAuth){
        res.redirect('/users/profile')
    }else{
        return next()
    }
}

// const imgUpload = multer({
//     dest:'./public/img',
// })

/* img upload */

// const client =  new Client({
//     connectionString: 'postgres://hleptzdrjequkj:783d3831e6c8713bfca51769adfa876595feed3c5b3856221e4b468727bab422@ec2-54-172-219-6.compute-1.amazonaws.com:5432/d3841v5vfmppff',
//     ssl: true
// })

// client.connect();

const multerStorage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"public");
    },
    filename:(req,file,cb)=>{
        const ext = file.mimetype.split("/")[1];
        cb(null, `${file.mimetype.split("/")[0]}/admin-${file.fieldname}-${Date.now()}.${ext}`);
    },
});

const multerFilter = (req,file,cb)=>{
    if(file.mimetype.split("/")[1]==="jpg" || file.mimetype.split("/")[1]==="gif" || file.mimetype.split("/")[1]==="jpeg" || file.mimetype.split("/")[1]==="png"){
        cb(null,true);    
    }else{
        cb(new Error("Not an image file"),false);
    }
}

const imgUpload = multer({
    storage:multerStorage,
    fileFilter:multerFilter,
})

/* img video upload */
const multerVStorage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"public");
    },
    filename:(req,file,cb)=>{
        const ext = file.mimetype.split("/")[1];
        cb(null, `${file.mimetype.split("/")[0]}/admin-${file.fieldname}-${Date.now()}.${ext}`);
    },
    fieldname:(req,file,cb)=>{
        
    }
});

const multerVFilter = (req,file,cb)=>{
    if(file.mimetype.split("/")[1]==="jpg" || file.mimetype.split("/")[1]==="jpeg" || file.mimetype.split("/")[1]==="png" || file.mimetype.split("/")[1]==="mp4" || file.mimetype.split("/")[1]==="mkv"){
        cb(null,true);    
    }else{
        cb(new Error("Not an video file"),false);
    }
}

const videoUpload = multer({
    storage:multerVStorage,
    fileFilter:multerVFilter,
})


const app = express()
const PORT = process.env.PORT || 4000

app.set('view engine', 'ejs')
app.use(express.urlencoded({extended:false}))

app.use(session({
    store: new pgSession({
        pool:pool,
        tableName:'session' 
    }),
    secret:'secret',
    resave:false,
    saveUninitialized:false,
}))

// app.use(flash())


// setting static folder
app.use(express.static(path.join(__dirname,'/public')))


/** routes **/

// home
app.get('/',async (req,res)=>{
    var result = await pool.query('SELECT * FROM product;');
    // console.log(result.rows)
    result = result.rows
    if(req.session.isAuth){
        auth = true
    }else{
        auth = false
    }
    res.render('home',{result,auth})
})

app.post('/',async (req,res)=>{
    var result = await pool.query('select prod.* from product prod, users us, polbnda_ind d where us.id=prod.sellerid and d.laa in (select p.laa from polbnda_ind p, users u where ST_Within(u.geom, p.geom) and u.id=$1)and ST_Within(us.geom,d.geom);',[req.session.user.id]);
    if(req.session.isAuth){
        auth = true
    }else{
        auth = false
    }
    res.render('home',{result:result.rows,auth})
})

// login
app.get('/users/login',ensureGuest,(req,res)=>{
    res.render('login')
})

app.post('/users/login',async (req,res)=>{
    var email = req.body.email
    var password = req.body.password
    // console.log(`lat:${req.body.latitude} lng:${typeof(req.body.longitude)}`)
    // console.log(email)
    var result = await pool.query('SELECT id, name, email, password, ST_X(ST_Transform(geom,4326)) as lat, ST_Y(ST_Transform(geom,4326)) as lng FROM users WHERE email=$1;',[email])
    if(result.rows.length>0){
        var user = result.rows[0]

        bcrypt.compare(password,user.password,(err,isMatch)=>{
            if(err){
                throw err
            }if(isMatch){
                req.session.user = user
                req.isAuthenticated=true
                req.session.isAuth = true
                req.session.save()
                res.render('profile',{user})
            }else{
                res.render('login',{message:"Email and password do not match"});
            }
        })
    }else{
        res.render('login',{message:"Email is not registered"})
    }
})


// app.get('/users/dashboard',(req,res)=>{
//     res.render('dashboard',{user:req.user.name})
// })

// register
app.get('/users/register',ensureGuest,(req,res)=>{
    res.render('register')
})

app.post('/users/register', async(req,res)=>{
    name = req.body.name
    email = req.body.email
    password = req.body.password
    cpassword = req.body.cpassword
    latitude = parseFloat(req.body.latitude)
    longitude = parseFloat(req.body.longitude)
    let errors=[]

    if(!name || !email || !password || !cpassword){
        errors.push({message:"Please enter all fields"})
    }

    if(password.length<6){
        errors.push({message:"Passwords should be atleast 6 characters"})
    }

    if(password!=cpassword){
        errors.push({message:"Passwords do not match"})
    }

    if(errors.length>0){
        res.render('register',{errors})
    }else{

        let hashedPassword = await bcrypt.hash(password,10);
        var result = await pool.query('SELECT * FROM users WHERE email = $1;',[email])
        if(result.rows.length>0){
            errors.push({message:"Email already exist"})
            res.render('register',{errors})
        }else{
            pool.query('INSERT INTO users(name,email,password,geom) VALUES($1, $2, $3,ST_SetSRID(ST_MakePoint($4,$5),4326)) RETURNING id, password;',[name,email,hashedPassword,longitude,latitude])
            // req.flash('success_msg','You are now registered, Please login')
            res.redirect('/users/login')
        }
        
    }

})

// profile
app.get('/users/profile', ensureAuth,(req,res)=>{
    // console.log(req.session.user)
    res.render('profile',{user:req.session.user})
})

// cart
app.get('/users/cart',ensureAuth,async(req,res)=>{
    var result = await pool.query('select * from product p where p.id in (select c.productid from cart c where c.userid = $1);',[req.session.user.id])
    result=result.rows
    // console.log(result)
    res.render('cart',{result})
})

// remove cart item
app.post('/remove',async(req,res)=>{
    var result = await pool.query('DELETE FROM cart WHERE productid = $1',[req.body.id]);
    res.redirect('/users/cart')
})

// show my ads
app.get('/users/ad',ensureAuth,async (req,res)=>{

    var result = await pool.query('SELECT * FROM product WHERE sellerid=$1;',[req.session.user.id])
    result = result.rows
    res.render('ad',{result})
})


// product view
app.post('/product',async(req,res)=>{
    var id = req.body.id
    // console.log(id)
    var result = await pool.query('SELECT p.*, u.email,u.phone FROM product p, users u WHERE p.id = $1 and u.id = p.sellerid;',[id])
    // console.log(result.rows)
    res.render('product',{result:result.rows[0],user:req.session.user})
})

// add product to cart
app.post('/addtocart', ensureAuth,async (req,res)=>{
    var id = req.body.id
    var date = new Date().toISOString().slice(0,19).replace('T',' ')
    
    if(req.session.isAuth){
        var result = await pool.query('INSERT INTO cart(userid,productid,cdate) VALUES($1,$2,$3)',[req.session.user.id,id,date])
        res.redirect('/users/cart');
    }else{
        res.redirect('/users/login')
    }
})

// logout
app.get('/users/logout',async (req,res)=>{
    req.session.isAuth=false
    req.isAuthenticated=false
    req.session.destroy()
    var result = await pool.query('SELECT * FROM product;');
    // console.log(result.rows)
    result = result.rows
    if(req.session){
        auth = true
    }else{
        auth = false
    }
    res.render('home',{result,auth})
})

// put ad page
app.get('/styl',ensureAuth,(req,res)=>{
    res.render('prodV',{type:false})
})

//  ad style
app.post('/styl',ensureAuth,(req,res)=>{
    var type = req.body.type
    res.render('prodV',{type})
})

// post ad
app.post('/adstyle',ensureAuth, videoUpload.fields([{name:'vid', maxCount:2},{name:'avatar',maxCount:4}]),async(req,res)=>{
    var name = req.body.pname
    var desc = req.body.desc
    var categ = req.body.categ
    var price = req.body.price
    var adtype = req.body.type

    if(adtype === "normal"){

        var i1 = req.files.avatar[0].filename
        var i2 = req.files.avatar[1].filename
        var i3 = req.files.avatar[2].filename
        var i4 = req.files.avatar[3].filename
        // console.log(req.files.avatar)
        // console.log(req.body.type)
    }

    if(adtype === "movtxt"){
        var i1 = ""
        var i2 = ""
        var i3 = ""
        var i4 = ""
    }

    if(adtype === "mix"){
        var i1 = req.files.avatar[0].filename
        var i2 = req.files.avatar[1].filename
        var i3 = req.files.vid[0].filename
        var i4 = req.files.vid[1].filename
        // console.log(req.files.vid)
    }

    if(adtype === "popup" || adtype === "overlay" || adtype === "sliding"){
        var i1 = req.files.avatar[0].filename
        var i2 = ""
        var i3 = ""
        var i4 = ""
    }

    // // console.log(req.session.user)
    // // var result = pool.query('INSERT INTO product(sellerid,name,description,price,category,image) VALUES($1,$2,$3,$4,$5, ARRAY[$6,$7,$8,$9])',[req.session.user.id, name, desc, price, categ,i1,i2,i3,i4])
    // console.log(`${i1} ${i2} ${i3} ${i4}`)
    // res.send("success")

    // console.log(req.session.user)
    var result = await pool.query('INSERT INTO product(sellerid,name,description,price,category,image,type) VALUES($1,$2,$3,$4,$5, ARRAY[$6,$7,$8,$9],$10)',[req.session.user.id, name, desc, price, categ,i1,i2,i3,i4,adtype])
    res.redirect('/users/ad')
    // res.render('prodV')
})

// delete product's ad
app.post('/delAd',ensureAuth,async(req,res)=>{
    var result = await pool.query('DELETE FROM product WHERE id = $1',[req.body.id]);
    res.redirect('/users/ad')
})

// get category
app.get('/category',async(req,res)=>{
    var result = await pool.query('SELECT * FROM product where category = $1;',[req.body.category]);
    // console.log(result.rows)
    // console.log(req.body.category)
    result = result.rows
    if(req.session.isAuth){
        auth = true
    }else{
        auth = false
    }
    res.render('home',{result,auth})
})

// post cateory
app.post('/category',async(req,res)=>{
    var result = await pool.query('SELECT * FROM product where category = $1;',[req.body.category]);
    // console.log(result.rows)
    // console.log(req.body.category)
    result = result.rows
    if(req.session.isAuth){
        auth = true
    }else{
        auth = false
    }
    res.render('home',{result,auth})

})


app.listen(PORT,()=>{
    console.log(`Server connected to port ${PORT}`);
})