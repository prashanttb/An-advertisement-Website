create extension postgis;

CREATE TABLE users(
    id BIGSERIAL PRIMARY KEY NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    password VARCHAR(200) NOT NULL,
    UNIQUE (email)
);
ALTER TABLE users ADD COLUMN geom geometry(Point,4326);
alter table users add column phone text;


CREATE TABLE product(
    id BIGSERIAL PRIMARY KEY NOT NULL,
    sellerid INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    price FLOAT NOT NULL,
    category VARCHAR(300) NOT NULL,
    image TEXT[] NOT NULL
) 
  -- ALTER TABLE "product" drop column image;
 GRANT ALL PRIVILEGES ON TABLE "product" TO ppp;
 GRANT USAGE, SELECT ON SEQUENCE product_id_seq TO ppp;
 alter table "product" add column type text;

CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
 GRANT ALL PRIVILEGES ON TABLE "session" TO ppp;


CREATE TABLE cart(
  id BIGSERIAL PRIMARY KEY NOT NULL,
  userid INTEGER NOT NULL,
  productid INTEGER NOT NULL,
  cdate DATE NOT NULL, 
) 
 GRANT ALL PRIVILEGES ON TABLE "cart" TO ppp;
  GRANT USAGE, SELECT ON SEQUENCE cart_id_seq TO ppp;


-- CREATE TABLE chat(
--   id BIGSERIAL PRIMARY KEY NOT NULL,
--   sentDateTime DATE NOT NULL,
--   sentBy INTEGER NOT NULL,
--   sentTo INTEGER NOT NULL,
--   msgContent TEXT NOT NULL,
-- )
--  GRANT ALL PRIVILEGES ON TABLE "chat" TO ppp;
--  GRANT USAGE, SELECT ON SEQUENCE chat_id_seq TO ppp;