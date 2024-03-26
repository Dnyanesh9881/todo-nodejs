

const todoDataValidation=({todo})=>{
    return new Promise ((resolve, reject)=>{
        if (!todo) reject("Missing Todo Text");
        if (typeof todo !== "string")
          reject("Todo is not a text" );
        if (todo.length < 3 && todo.length > 100)
        reject ("Text length should be in between 3-100");

        resolve();
    })
}

module.exports=todoDataValidation;