import { useEffect, useState } from "react";
import { addMedia, getMedia, host, removeMedia } from "./api";

const App = () => {
  const [mediaList, setMediaList] = useState([]);
  const [text, setText] = useState([]);
  const [selectedFile1, setSelectedFile1] = useState();
  const [selectedFile2, setSelectedFile2] = useState();

  const handleUpload = () => {
    const formData = new FormData();
    formData.append("file1", selectedFile1, selectedFile1.name);
    formData.append("file2", selectedFile2, selectedFile2.name);
    formData.append("text", text);
    addMedia(formData).then(() => {
      const newList = [...mediaList];
      newList.push(selectedFile1.name);
      newList.push(selectedFile2.name);
      setMediaList(newList);
    });
  };

  const handleRemove = (file) => {
    removeMedia({ file }).then(() => {
      const newList = [...mediaList];
      newList.splice(newList.indexOf(file), 1);
      setMediaList(newList);
    });
  };

  const handleFileChange1 = (e) => {
    setSelectedFile1(e.target.files[0]);
  };

  const handleFileChange2 = (e) => {
    setSelectedFile2(e.target.files[0]);
  };

  useEffect(() => {
    getMedia().then((res) => {
      setMediaList(res);
    });
  }, []);

  return (
    <div>
      <h1>Files</h1>
      <table style={{ border: "solid 1px black", minWidth: "300px" }}>
        <tbody>
          <tr>
            <th>File Name</th>
            <th>Action</th>
          </tr>
          {mediaList.map((file, index) => (
            <tr key={index}>
              <td>{file}</td>
              <td>
                {file !== ".gitignore" && (
                  <button onClick={() => handleRemove(file)}>
                    <span>Remove</span>
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <br />
      <span>File1: </span>
      <input type="file" onChange={handleFileChange1} />
      <br />
      <span>File2: </span>
      <input type="file" onChange={handleFileChange2} />
      <br />
      <span>Text: </span>
      <input
        type="text"
        onChange={(e) => setText(e.target.value)}
        value={text}
        placeholder="type any text"
      />
      <br />

      <button
        disabled={!selectedFile1?.name && !selectedFile2?.name}
        onClick={handleUpload}
      >
        Send files
      </button>
    </div>
  );
};

export default App;
