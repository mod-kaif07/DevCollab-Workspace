import React from "react";

const ProjectDetailsPage = ({ project, setprojectDetails }) => {
  return (
    <div className="projectdetialssection h-full w-full bg-white flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-800">Project Members</h2>

        <button
          onClick={() => setprojectDetails(false)}
          className="p-1.5 rounded-full hover:bg-gray-200 transition"
        >
          <i className="ri-close-fill text-lg text-gray-600"></i>
        </button>
      </header>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {project?.user?.length > 0 ? (
          project.user.map((user, key) => (
            <div
              key={key}
              className="flex items-center gap-3 px-3 py-2 text-black rounded-lg border bg-orange-100 border-gray-900 hover:bg-white transition cursor-pointer"
            >
              <span className="text-sm text-gray-800">{user.email}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No members found</p>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
