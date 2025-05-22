const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = 3000;


// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@blogcluster.tzdrh.mongodb.net/?retryWrites=true&w=majority&appName=BlogCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const recipe_db = client.db("recipeBook");
    const recipeCollection = recipe_db.collection("recipeItems");

    app.post("/add-recipe", async (req, res) => {
      const newRecipe = req.body;
      console.log(newRecipe);

      try {
        const result = await recipeCollection.insertOne(newRecipe);
        // console.log(result);
        if (result.insertedId) {
          return res.status(201).json(result);
        } else {
          return res.status(400).json({ message: "Could not add recipe" });
        }
      } catch (error) {
        res.status(500).json({
          error:
            "Internal server error when creating new recipe :" + error.message,
        });
      }
    });

    app.get("/recipe", async (req, res) => {
      try {
        const recipes = await recipeCollection.find().toArray();

        if (!recipes.length) {
          return res.status(404).json({ message: "No recipes found" });
        }

        res.status(200).json(recipes);
      } catch (error) {
        res.status(500).json({
          error: "Internal server error while fetching recipes",
          details: error.message,
        });
      }
    });

    app.get("/recipe/:id", async (req, res) => {
      const recipeId = req.params.id;

      try {
        const query = { _id: new ObjectId(recipeId) };
        const recipeItem = await recipeCollection.findOne(query);

        if (!recipeItem) {
          return res.status(404).json({ message: "Recipe not found" });
        }

        res.status(200).json(recipeItem);
      } catch (error) {
        res.status(500).json({
          error: "Invalid ID format or server error: " + error.message,
        });
      }
    });

    app.patch("/update-recipe/:id", async (req, res) => {
      const recipeId = req.params.id;
      const updatedRecipeItem = req.body;
      try {
        const query = { _id: new ObjectId(recipeId) };
        const updatedItems = { $set: updatedRecipeItem };
        const updatedItem = await recipeCollection.updateOne(
          query,
          updatedItems
        );

        if (updatedItem.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "Recipe not found or already up-to-date" });
        }

        res.status(200).send(updatedItem);
      } catch (error) {
        res.status(500).json({
          error: "server error: " + error.message,
        });
      }
    });

    // app.put("/recipe/like/:id", async (req, res) => {
    //   try {
    //     const recipe = await recipeCollection.findByIdAndUpdate(
    //       { _id: new ObjectId(req.params.id) },
    //       { $inc: { likeCount: 1 } },
    //       { new: true }
    //     );
    //     if (!recipe)
    //       return res.status(404).json({ message: "Recipe not found" });

    //     res.json(recipe);
    //   } catch (error) {
    //     res.status(500).json({ message: "Server error", error });
    //   }
    // });

    app.put("/recipe/like/:id", async (req, res) => {
      try {
        const result = await recipeCollection.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $inc: { likeCount: 1 } },
          { returnDocument: "after" }
        );
        // console.log(result);

        if (!result.likeCount)
          return res.status(404).json({ message: "Recipe not found" });

        res.json(result.likeCount);
      } catch (error) {
        console.error("MongoDB error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Top likes api
    app.get("/recipes/top-liked", async (req, res) => {
      try {
        const topLikedRecipes = await recipeCollection
          .find()
          .sort({ likeCount: -1 })
          .limit(6)
          .toArray();

        res.json(topLikedRecipes);
      } catch (error) {
        console.error("Error fetching top liked recipes:", error);
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Sample route
app.get("/", (req, res) => {
  res.send("Hello from Express API!");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
