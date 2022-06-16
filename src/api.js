import axios from "axios";

export const host = `http://${window.location.hostname}:10000`;

export const getMedia = async () => {
  const url = `${host}/media`;
  const response = await axios.get(url);
  return response.data;
};

export const addMedia = async (payload) => {
  console.log("... uploading data");
  const url = `${host}/media/add`;
  const response = await axios.post(url, payload);
  return response.data;
};

export const removeMedia = async (file) => {
  console.log("... removing media");
  const url = `${host}/media/delete`;
  const response = await axios.post(url, file);
  return response.data;
};