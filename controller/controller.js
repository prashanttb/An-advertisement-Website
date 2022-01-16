const express = require('express')
const router = express.Router()


router.get('/',async (req,res)=>{
    var result = await pool.query('SELECT * FROM product;');
    // console.log(result.rows)
    result = result.rows
    res.render('home',{result,user:req.session.user})
})

router.get('/users/register',(req,res)=>{
    res.render('register')
})

router.get('/users/login',(req,res)=>{
    res.render('login')
})

router.post('/users/login',async (req,res)=>{
    var email = req.body.email
    var password = req.body.password
    console.log(`lat:${req.body.latitude} lng:${typeof(req.body.longitude)}`)
    // console.log(email)
    var result = await pool.query('SELECT id, name, email, password, ST_X(ST_Transform(geom,4326)) as lat, ST_Y(ST_Transform(geom,4326)) as lng FROM users WHERE email=$1;',[email])
    if(result.rows.length>0){
        var user = result.rows[0]

        bcrypt.compare(password,user.password,(err,isMatch)=>{
            if(err){
                throw err
            }if(isMatch){
                req.session.user = user
                req.session.isAuth = true
                req.session.save()
                res.redirect('/users/profile')
            }else{
                res.render('login',{message:"Email and password do not match"});
            }
        })
    }else{
        res.render('login',{message:"Email is not registered"})
    }
})


router.get('/users/dashboard',(req,res)=>{
    res.render('dashboard',{user:req.user.name})
})

router.post('/users/register', async(req,res)=>{
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
            pool.query('INSERT INTO users(name,email,password,geom) VALUES($1, $2, $3,ST_SetSRID(ST_MakePoint($4,$5),4326)) RETURNING id, password;',[name,email,hashedPassword,latitude,longitude])
            req.flash('success_msg','You are now registered, Please login')
            res.redirect('/users/login')
        }
        
    }

})

router.get('/users/profile',(req,res)=>{
    // console.log(req.session.user)
    res.render('profile',{user:req.session.user})
})

router.get('/users/cart',async(req,res)=>{
    var result = await pool.query('select distinct p.* from product p, cart c where c.userid = $1;',[req.session.user.id])
    result=result.rows
    // console.log(result)
    res.render('cart',{result})
})

router.get('/users/ad',async (req,res)=>{

    var result = await pool.query('SELECT * FROM product WHERE sellerid=$1;',[req.session.user.id])
    result = result.rows
    res.render('ad',{result})
})

router.get('/users/putad',(req,res)=>{
    res.render('putad')
})

router.post('/users/putad',imgUpload.array('avatar',4),(req,res)=>{
    // console.log(req.files)
    var name = req.body.pname
    var desc = req.body.desc
    var categ = req.body.categ
    var price = req.body.price
    var i1 = req.files[0].filename
    var i2 = req.files[1].filename
    var i3 = req.files[2].filename
    var i4 = req.files[3].filename
    // console.log(req.session.user)
    var result = pool.query('INSERT INTO product(sellerid,name,description,price,category,image) VALUES($1,$2,$3,$4,$5, ARRAY[$6,$7,$8,$9])',[req.session.user.id, name, desc, price, categ,i1,i2,i3,i4])
    
    res.render('ad')
})


router.post('/product',async(req,res)=>{
    var id = req.body.id
    // console.log(id)
    var result = await pool.query('SELECT * FROM product WHERE id = $1',[id])
    console.log(result.rows)
    req.session.user.product = result.rows[0]
    req.session.save()
    res.render('product',{result:result.rows[0]})
    delete req.session.user.product
})


router.post('/addtocart',async (req,res)=>{
    var id = req.body.id
    var date = new Date().toISOString().slice(0,19).replace('T',' ')
    
    if(req.session.isAuth){
        var result = await pool.query('INSERT INTO cart(userid,productid,cdate) VALUES($1,$2,$3)',[req.session.user.id,id,date])
        res.redirect('/users/cart');
    }else{
        res.redirect('/users/login')
    }
})

router.get('/users/logout',(req,res)=>{
    
})
