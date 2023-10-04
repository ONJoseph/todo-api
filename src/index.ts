import { Elysia } from "elysia";
import todos from "./data/todo.json";
import { Todo } from "./types/todo";
import { swagger } from "@elysiajs/swagger";
import cors from "@elysiajs/cors";

const app = new Elysia()
    .use(swagger())
    .use(cors({
      origin: true
    }))
    ;

// Define the array of todos
const TODOS: Todo[] = todos as Todo[];

app.get("/", () => {
  return "Hey there! This is your favorite Todo App!";
});

app.get("/todo", ({ query, set }) => {
  if (query?.id) {
    const id = parseInt(query.id as string);

    const todo = TODOS.find((todo) => todo.id === id);
    if (todo) return new Response(JSON.stringify(todo));
    set.status = 404;
    return "Task not found";
  }
  return new Response(JSON.stringify(TODOS));
}, {
  detail: {
    parameters: [{
      name: "id",
      in: "todo",
      description: "Get todo by ID"
    }]
  }
});

app.post("/todo", ({ body, set }) => {
  const todo = {
    id: TODOS.length + 1,
    ...(body as Omit<Todo, "id">),
  };
  TODOS.push(todo);
  set.status = 201;
  return todo;
},
{
  detail: {
    parameters: [{
      name: "Post",
      in: "todo",
      description: "Post todo"
    }]
  }
}
);

app.put("/todo", ({ query, body, set }) => {
  if (!query?.id) {
    set.status = 400;
    return "Missing id";
  }

  const todo = body as Partial<Todo>;
  const id = parseInt(query.id as string);
  const index = TODOS.findIndex((todo) => todo.id === id);
  if (index === -1) {
    set.status = 404;
    return "Task not found";
  }
  TODOS[index] = {
    ...TODOS[index],
    title: todo.title ?? TODOS[index].title,
    description: todo.description ?? TODOS[index].description,
  };
  return new Response(JSON.stringify(TODOS[index]));
},
{
  detail: {
    parameters: [{
      name: "id",
      in: "todo",
      description: "Put todo by ID"
    }]
  }
}
);

app.delete("/todo", ({ query, set }) => {
  if (!query?.id) {
    set.status = 400;
    return "Missing id";
  }

  const id = parseInt(query.id as string);
  const index = TODOS.findIndex((todo) => todo.id === id);
  if (index === -1) {
    set.status = 404;
    return "Task not found";
  }
// Remove the todo task from the TODOS array
  TODOS.splice(index, 1);

// Return an appropriate response
set.status = 200; // You can also use 204 (No Content) if you prefer
return {
  message: "Task deleted successfully",
  taskId: id,
};
},
{
  detail: {
    parameters: [{
      name: "id",
      in: "todo",
      description: "Delete todo by ID"
    }]
  }
}
);

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
