import axios from "axios";

const api = axios.create({
  baseURL: `http://localhost:5000/api`, // <-- HTTP instead of HTTPS
});


export default api;
