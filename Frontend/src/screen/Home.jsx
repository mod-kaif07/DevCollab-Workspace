import { useContext, useState, useEffect } from "react";
import React from "react";
import { UserContext } from "../context/UserContext";
import "remixicon/fonts/remixicon.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../config/axios";

const Home = () => {
  const { user } = useContext(UserContext);
  const [Ismodal, setIsmodal] = useState(false);
  const [Project, setProject] = useState("");
  const [projects, setProjects] = useState([]);

  const navigate = useNavigate();


  const fetchProjects = () => {
    axiosInstance
      .get("/projects/all")
      .then((res) => {
        console.log("Projects fetched:", res.data);
        setProjects(res.data);
      })
      .catch((err) => {
        console.error("Error fetching projects:", err);
      });
  };
  const CreateProject = (e) => {
    e.preventDefault();
    console.log("Project Name:", Project);

    axiosInstance
      .post("/projects/create", {
        name: Project,
      })

      .then((res) => {
        alert("Project Created Successfully");
        setIsmodal(false);
        setProject(""); // Clear input
        fetchProjects();
      })
      .catch((err) => {
        alert("Project Creation Failed: ");
      });
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <main className="p-6">
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Projects</h2>

          <button
            onClick={() => setIsmodal(true)}
            className="flex items-center gap-2 px-3 py-2 
                   border border-gray-300 rounded-lg 
                   text-sm text-gray-700 
                   hover:bg-gray-100 transition"
          >
            <i className="ri-add-large-line text-lg"></i>
            <span>New Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              onClick={() => {
                navigate("/project/", {
                  state: { project }, // ✅ single project
                });
              }}
              key={project._id}
              className="border border-gray-300 rounded-xl p-4 
                     flex flex-col justify-between
                     min-w-52 bg-white
                     hover:shadow-md hover:border-blue-300
                     transition"
            >
              <h3 className="font-semibold text-gray-800 truncate">
                {project.name}
              </h3>

              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <i className="ri-user-3-fill"></i>
                <span>{project.user.length} collaborators</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal (unchanged) */}
      {Ismodal && (
        <div className="fixed inset-0 bg-gray-700 bg-opacity-80 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={CreateProject} className="space-y-4">
              <input
                onChange={(e) => setProject(e.target.value)}
                type="text"
                 value={Project}
                placeholder="Project Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsmodal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg 
                         hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg 
                         hover:bg-blue-600 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
