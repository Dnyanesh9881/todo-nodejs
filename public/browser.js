// const axios = require("axios");

// const { default: axios } = require("axios");

let skip=0;
window.onload = generateTodos();

async function generateTodos() {
  console.log(skip);
  try {
    const res = await axios.get(`/read-item?skip=${skip}`);
    const todoData = res.data.data;
    // console.log(res.data.data);
       
    if (res.data.status !== 200) {
      alert(res.data.message);
      return;
    }
    skip+=todoData.length;
    console.log(todoData);
    console.log(skip);
    document.getElementById("item_list").insertAdjacentHTML(
      "beforeend",
      todoData.map((item) => {
        return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
            <span class="item-text"> ${item.todo}</span>
            <div>
            <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
            <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
            </div></li>`;
      }).join("")
    );
  } catch (error) {
    console.log(error);
  }
}

 document.addEventListener("click",async (event)=>{
        
    if(event.target.classList.contains("edit-me")){
        const todoText=prompt("enter a todo name");
        const todoId=event.target.getAttribute("data-id");

        // console.log(todoText, todoId);
        try {
          const res=await axios.post("/edit-item", {todoText, todoId});
        //   console.log(res.data, "edit res");
            if (res.data.status !== 200) {
                alert(res.data.message);
                return;
              }
            event.target.parentElement.parentElement.querySelector(".item-text").innerText=todoText;
        } catch (error) {
            console.log(error);
        }
    }else if(event.target.classList.contains("delete-me")){
        // console.log("delete clicked");
        const deleteId=event.target.getAttribute("data-id");
        // console.log(deleteId);

        try {
            const res=await axios.post("/delete-item", {deleteId});
            // console.log(res.data);
            if (res.data.status !== 200) {
                alert(res.data.message);
                return;
              }
              event.target.parentElement.parentElement.remove();

        } catch (error) {
            console.log(error);
        }
    }else if (event.target.classList.contains("add_item")) {
      const todo = document.getElementById("create_field").value;
      console.log(todo);
  
      axios
        .post("/create-item", { todo })
        .then((res) => {
          if (res.data.status !== 201) {
            alert(res.data.message);
            return;
          }
          console.log(res);
          document.getElementById("create_field").value = "";
  
          document.getElementById("item_list").insertAdjacentHTML(
            "beforeend",
            `          <li class='list-group-item list-group-item-action d-flex align-items-center justify-content-between'>
              <span class='item-text'> ${res.data.data.todo}</span>
              <div>
                <button
                  data-id='${res.data.data._id}'
                  class='edit-me btn btn-secondary btn-sm mr-1'
                >
                  Edit
                </button>
                <button
                  data-id='${res.data.data._id}'
                  class='delete-me btn btn-danger btn-sm'
                >
                  Delete
                </button>
              </div>
            </li>`
          );
        })
        .catch((err) => console.log(err));
    }else if(event.target.classList.contains("show_more")){
      generateTodos();
    }
 })
