import React, { useRef } from "react";
import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import ProjectDetailsPage from "./ProjectDetailsPage";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import axiosInstance from "../config/axios";
import Markdown from "markdown-to-jsx";
import hljs from "highlight.js";
import { getWebContainer } from "../config/webContainers";

import {
  initializeSocket,
  receiveMessage,
  sendMessage,
} from "../config/socket";
import { UserContext } from "../context/UserContext";

const ProjectPage = () => {
  const location = useLocation();
  const [projectDetails, setprojectDetails] = useState(false);
  const projectDetialsPanelRef = useRef(null);
  const [userinfo, setuserInfo] = useState(false);
  const [selectduser, setselectduser] = useState([]);
  const [users, setusers] = useState([]);
  const [project, setproject] = useState(location.state.project);
  const [sendMessageinput, setsendMessageinput] = useState("");
  const messageBox = useRef();
  const [messages, setMessages] = useState([]);
  const { user } = useContext(UserContext);

  const [fileTree, setFileTree] = useState({});
  const [currentFile, setCurrentFile] = useState(null);
  const [currentContent, setCurrentContent] = useState("");
  const [buildCommand, setBuildCommand] = useState(null);
  const [startCommand, setStartCommand] = useState(null);

  const [webContainer, setwebContainer] = useState(null);

  const [iframeUrl, setIframeUrl] = useState(null);
  const [runProcess, setRunProcess] = useState(null);

  const userMap = React.useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u._id] = u.email;
    });
    return map;
  }, [users]);

  const handleclick = (id) => {
    if (selectduser.includes(id)) {
      setselectduser(selectduser.filter((userId) => userId !== id));
    } else {
      setselectduser([...selectduser, id]);
    }
  };

  useGSAP(
    function () {
      if (projectDetails) {
        gsap.to(projectDetialsPanelRef.current, {
          transform: "translateY(0%)",
        });
      } else {
        gsap.to(projectDetialsPanelRef.current, {
          transform: "translateY(100%)",
        });
      }
    },
    [projectDetails],
  );

  function savecode() {
    axiosInstance
    .put("/projects/update-file-tree", {
      projectId: project._id,
      fileTree,
      buildCommand,
      startCommand,
    })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  useEffect(() => {
    initializeSocket(project._id);

    if (!webContainer) {
      getWebContainer().then((container) => {
        setwebContainer(container);
        console.log("webContainer Connected");
      });
    }

    receiveMessage("project-message", (data) => {
      // Handle AI typing indicator
      if (data.isTyping) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.isTyping);
          return [...filtered, data];
        });
        return;
      }

      // 2️⃣ Handle AI response (text + fileTree)
      if (data.sender === "ai") {
        try {
          const parsed = JSON.parse(data.message);

          // Always show text in chat
          setMessages((prev) => [
            ...prev.filter((m) => !m.isTyping),
            {
              sender: "ai",
              senderEmail: "AI",
              message: parsed.text || "Done",
            },
          ]);

          // If AI returned code project → update editor state
          if (parsed.fileTree) {
            setFileTree(parsed.fileTree);
            setBuildCommand(parsed.buildCommand || null);
            setStartCommand(parsed.startCommand || null);
          }
        } catch (err) {
          // Fallback: plain AI text
          setMessages((prev) => [
            ...prev.filter((m) => !m.isTyping),
            {
              sender: "ai",
              senderEmail: "AI",
              message: data.message,
            },
          ]);
        }
        return;
      }

      // Remove typing indicator and add new message
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isTyping);

        // Don't duplicate messages sent by current user (they already see their own)
        if (data.sender === user._id) {
          return filtered;
        }

        return [
          ...filtered,
          {
            ...data,
            senderEmail: data.senderEmail || userMap[data.sender] || "Unknown",
          },
        ];
      });
    });

    axiosInstance
      .get(`projects/get-project/${location.state?.project?._id}`)
      .then((res) => {
        setproject({
          ...location.state.project,
          user: res.data.user,
        });
        if (
          res.data.project.fileTree &&
          Object.keys(res.data.project.fileTree).length > 0
        ) {
          console.log("✅ Loading fileTree:", res.data.project.fileTree);
          setFileTree(res.data.project.fileTree);

          // Mount to webContainer if available
          if (webContainer) {
            webContainer.mount(res.data.project.fileTree);
          }
        } else {
          console.log("⚠️ No fileTree found in database");
        }

        // ✅ Load buildCommand
        if (res.data.project.buildCommand) {
          console.log(
            "✅ Loading buildCommand:",
            res.data.project.buildCommand,
          );
          setBuildCommand(res.data.project.buildCommand);
        }

        // ✅ Load startCommand
        if (res.data.project.startCommand) {
          console.log(
            "✅ Loading startCommand:",
            res.data.project.startCommand,
          );
          setStartCommand(res.data.project.startCommand);
        }
      }).catch((err) => {
      console.error("❌ Error fetching project:", err);
    });

    axiosInstance
      .get("/users/all")
      .then((res) => {
        setusers(res.data.users);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
      });
  }, [project._id]);

  function addCollaborators() {
    const projectId = location.state?.project?._id;

    if (!projectId) {
      alert("Project not found. Please reopen the project.");
      return;
    }

    axiosInstance
      .put("projects/add-user", {
        projectId: projectId,
        users: selectduser,
      })
      .then(() => {
        alert("Collaborators added successfully");
        setuserInfo(false);
        setselectduser([]);
      })
      .catch((err) => {
        console.error("Error adding collaborators:", err);
      });
  }

  function SyntaxHighlightedCode(props) {
    const ref = useRef(null);

    useEffect(() => {
      if (ref.current && props.className?.includes("lang-") && window.hljs) {
        window.hljs.highlightElement(ref.current);
        ref.current.removeAttribute("data-highlighted");
      }
    }, [props.className, props.children]);

    return <code {...props} ref={ref} />;
  }

  function sendMessageFunction() {
    const payload = {
      message: sendMessageinput,
      sender: user._id,
      senderEmail: user.email,
    };

    // Show message instantly for current user
    appendIncomingMessage(payload);

    // Send to server (will be broadcast to others)
    sendMessage("project-message", payload);

    setsendMessageinput("");
  }

  function appendIncomingMessage(messageObject) {
    setMessages((prev) => [...prev, messageObject]);
  }

  function scrollToBottom() {
    if (!messageBox.current) return;

    messageBox.current.scrollTo({
      top: messageBox.current.scrollHeight,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const FileTree = ({ tree }) => {
    return Object.entries(tree).map(([name, node]) => {
      // File
      if (node.file) {
        return (
          <div
            key={name}
            onClick={() => {
              setCurrentFile(name);
              setCurrentContent(node.file.contents || "");
            }}
            className="cursor-pointer px-2 py-1 hover:bg-gray-200 text-sm"
          >
            📄 {name}
          </div>
        );
      }

      // Folder (matches `directory` from AI)
      if (node.directory) {
        return (
          <div key={name} className="ml-2">
            <div className="font-semibold text-sm">📁 {name}</div>
            <div className="ml-3">
              <FileTree tree={node.directory} />
            </div>
          </div>
        );
      }

      return null;
    });
  };

  // Add this function to handle code editing
  const handleCodeChange = (newContent) => {
    setCurrentContent(newContent);

    if (currentFile && fileTree) {
      setFileTree((prevTree) => {
        const newTree = JSON.parse(JSON.stringify(prevTree)); // Deep clone

        const updateFileInTree = (tree, fileName, content) => {
          for (let key in tree) {
            if (key === fileName && tree[key].file) {
              tree[key].file.contents = content;
              return true;
            }
            if (tree[key].directory) {
              if (updateFileInTree(tree[key].directory, fileName, content)) {
                return true;
              }
            }
          }
          return false;
        };

        updateFileInTree(newTree, currentFile, newContent); // ⭐ FIXED
        return newTree;
      });
    }
  };

  return (
    <main className="h-screen w-screen flex">
      <section className="left w-80 min-h-screen bg-gray-500 flex flex-col">
        <header className="h-18 bg-amber-300 flex items-center justify-end px-3">
          {userinfo ? (
            <button
              onClick={() => {
                setuserInfo(false);
                setselectduser([]);
              }}
              className="text-xs pl-4 text-center flex flex-col items-center"
            >
              <i className="ri-arrow-down-wide-fill text-2xl"></i>
              <p className="text-[12px]">Close</p>
            </button>
          ) : (
            <button
              onClick={() => setuserInfo(true)}
              className="text-xs text-center flex flex-col items-center"
            >
              <i className="ri-add-large-line text-lg"></i>
              <p className="text-[10px]">Add</p>
              <p className="text-[8px]">Collaborators</p>
            </button>
          )}

          <button
            onClick={() => {
              setprojectDetails(!projectDetails);
              setuserInfo(false);
            }}
            className="p-2 ml-auto h-15 flex flex-col items-center rounded hover:bg-amber-400 transition-colors duration-800 ease-in-out"
          >
            <i className="ri-group-line text-xl text-gray-500"></i>
            <span className="text-xs text-gray-600">Teams</span>
          </button>
        </header>

        <div className="conversation relative flex-1 flex flex-col overflow-hidden">
          {/* Messages area */}
          <div
            ref={messageBox}
            className="message-box flex-1 overflow-y-auto px-4 py-3 space-y-1.5 bg-gray-50"
          >
            {/* ⭐ CHANGE 4: Updated message rendering to show AI messages with different styling */}
            {messages.map((msg, index) => {
              const isMe = msg.sender === user._id;
              const isAI = msg.sender === "ai";
              const isTyping = msg.isTyping;
              const isError = msg.isError;

              return (
                <div
                  key={index}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-3 py-1.5 rounded-2xl max-w-[65%] shadow-sm
                      ${
                        isMe
                          ? "bg-green-500 rounded-br-sm"
                          : isAI
                            ? isError
                              ? "bg-red-100 border border-red-300 rounded-bl-sm"
                              : "bg-blue-100 border border-blue-300 rounded-bl-sm"
                            : "bg-white border border-gray-200 rounded-bl-sm"
                      }`}
                  >
                    <p
                      className={`text-[10px] leading-tight mb-0.5 ${
                        isMe
                          ? "text-green-100 text-right"
                          : isAI
                            ? "text-blue-600 font-semibold"
                            : "text-gray-400"
                      }`}
                    >
                      {msg.senderEmail}
                    </p>

                    <div
                      className={`text-sm leading-snug ${
                        isMe
                          ? "text-white"
                          : isAI
                            ? isError
                              ? "text-red-700"
                              : "text-blue-900"
                            : "text-gray-800"
                      } ${isTyping ? "italic" : ""}`}
                    >
                      {isAI ? (
                        <div className="overflow-auto bg-blue-50 rounded p-2">
                          <Markdown
                            options={{
                              overrides: {
                                code: SyntaxHighlightedCode,
                              },
                            }}
                          >
                            {msg.message}
                          </Markdown>
                        </div>
                      ) : (
                        <p>{msg.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input area */}
          {/* ⭐ CHANGE 5: Added Enter key support and disabled state for send button */}
          <div className="inputfeild text-bottom border-t border-gray-300 p-3 flex gap-2 bg-white">
            <input
              onChange={(e) => {
                setsendMessageinput(e.target.value);
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && sendMessageinput.trim()) {
                  sendMessageFunction();
                }
              }}
              value={sendMessageinput}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Type a message.. (use @ai for AI)"
            />
            <button
              onClick={sendMessageFunction}
              disabled={!sendMessageinput.trim()}
              className="bg-amber-400 text-white px-4 py-2 rounded-lg hover:bg-amber-500 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>

          {/* Project Details Panel */}
          <div
            ref={projectDetialsPanelRef}
            className="absolute inset-0 bg-white z-20"
            style={{ transform: "translateY(100%)" }}
          >
            <ProjectDetailsPage
              setprojectDetails={setprojectDetails}
              project={project}
            />
          </div>

          {/* User Info Panel */}
          {userinfo && (
            <div className="absolute inset-0 bg-gray-200 z-30 flex flex-col">
              {/* Header */}
              <div className="h-14 bg-gray-300 flex items-center px-3">
                <h3 className="text-sm font-semibold">Add Collaborators</h3>
                <button
                  onClick={() => {
                    setuserInfo(false);
                    setselectduser([]);
                  }}
                  className="ml-auto h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-400"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              {/* Scrollable user list */}
              <div className="flex-1 overflow-y-auto p-4">
                {Array.isArray(users) && users.length > 0 ? (
                  users.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleclick(user._id)}
                      className={`flex items-center gap-3 py-2 px-2 rounded-lg cursor-pointer transition mb-2
                        ${selectduser.includes(user._id) ? "bg-gray-400" : "hover:bg-gray-100"}`}
                    >
                      <div className="bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center">
                        <i className="ri-user-line text-gray-600"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.email}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 text-sm">
                    No users found
                  </p>
                )}
              </div>

              {/* Fixed bottom button */}
              <div className="p-3 border-t border-gray-300">
                <button
                  onClick={() => {
                    addCollaborators();
                  }}
                  className="w-full h-10 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Add Collaborators ({selectduser.length})
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="right bg-amber-200 h-full flex-grow flex">
        {/* Explorer */}
        <div className="explorer w-64 bg-gray-100 p-2 overflow-auto border-r">
          <h3 className="font-semibold mb-2">Explorer</h3>
          {Object.keys(fileTree).length === 0 ? (
            <p className="text-sm text-gray-500">Ask AI to create a project</p>
          ) : (
            <FileTree tree={fileTree} />
          )}
        </div>

        {/* Code Editor */}
        <div className="code-editor bg-white flex-grow p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{currentFile || "Select a file"}</h3>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={savecode}
                disabled={!currentFile}
                className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <i className="ri-save-line"></i>
                Save
              </button>

              <button
                onClick={() => {
                  if (currentContent) {
                    navigator.clipboard.writeText(currentContent);
                    alert("Code copied to clipboard!");
                  }
                }}
                disabled={!currentContent}
                className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <i className="ri-file-copy-line"></i>
                Copy
              </button>
            </div>
          </div>

          {/* Make the code editable with textarea */}
          <textarea
            value={currentContent}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="code-scroll bg-gray-900 text-green-300 p-3 rounded flex-grow overflow-auto font-mono text-sm resize-none"
            placeholder="// AI generated code will appear here"
            spellCheck={false}
          />

          {buildCommand && startCommand && (
            <div className="mt-2 text-sm text-gray-600">
              ▶ Run:
              <pre className="bg-gray-100 p-2 rounded mt-1">
                {buildCommand.mainItem} {buildCommand.commands.join(" ")}
                {"\n"}
                {startCommand.mainItem} {startCommand.commands.join(" ")}
              </pre>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ProjectPage;
