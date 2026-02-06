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

  // ⭐ NEW STATE: For iframe preview
  const [iframeUrl, setIframeUrl] = useState(null);
  const [runProcess, setRunProcess] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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

  useEffect(() => {
    initializeSocket(project._id);

    if (!webContainer) {
      getWebContainer().then((container) => {
        setwebContainer(container);
        console.log("✅ WebContainer Connected");

        // Listen for server-ready event globally
        container.on("server-ready", (port, url) => {
          console.log(`🎉 SERVER-READY EVENT: Port ${port}, URL: ${url}`);
          setIframeUrl(url);
        });
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

      // ⭐ FIXED: Handle AI response (supports BOTH plain text AND JSON)
      if (data.sender === "ai") {
        let parsedMessage = null;
        let aiText = "";
        let aiFileTree = null;
        let aiBuildCommand = null;
        let aiStartCommand = null;

        // 🔧 TRY to parse as JSON first
        try {
          parsedMessage = JSON.parse(data.message);
          
          console.log("🤖 AI Response received (JSON):", parsedMessage);
          
          // Extract data from JSON
          aiText = parsedMessage.text || "Done";
          aiFileTree = parsedMessage.fileTree || null;
          aiBuildCommand = parsedMessage.buildCommand || null;
          aiStartCommand = parsedMessage.startCommand || null;
          
          console.log("📁 FileTree structure:", aiFileTree);
          
        } catch (err) {
          // 🔧 If JSON parsing fails, treat as plain text
          console.log("🤖 AI Response received (Plain Text):", data.message);
          aiText = data.message; // Use the message as-is
          
          // Check if the message looks like it might contain JSON (malformed)
          if (data.message.includes('{') && data.message.includes('}')) {
            console.warn("⚠️ Message looks like JSON but failed to parse:", err);
            console.warn("💡 Your backend might be sending malformed JSON");
          }
        }

        // Always show text in chat (whether JSON or plain text)
        setMessages((prev) => [
          ...prev.filter((m) => !m.isTyping),
          {
            sender: "ai",
            senderEmail: "AI",
            message: aiText,
          },
        ]);

        // If we got a fileTree from JSON → update editor state
        if (aiFileTree) {
          console.log("📝 Setting fileTree with keys:", Object.keys(aiFileTree));
          setFileTree(aiFileTree);
          setBuildCommand(aiBuildCommand);
          setStartCommand(aiStartCommand);

          // 🔧 AUTO-MOUNT: Automatically mount to WebContainer when AI returns code
          if (webContainer) {
            webContainer
              .mount(aiFileTree)
              .then(() => {
                console.log("✅ FileTree auto-mounted from AI response");
                return webContainer.fs.readdir("/");
              })
              .then((files) => {
                console.log("✅ Files in WebContainer root:", files);
              })
              .catch((err) => {
                console.error("❌ Auto-mount failed:", err);
              });
          }
        } else {
          console.log("ℹ️ No fileTree in AI response (normal chat message)");
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

  // ⭐ NEW FUNCTION: Run the web container (FIXED VERSION)
  const handleRunProject = async () => {
    if (!webContainer) {
      alert("WebContainer not initialized. Please refresh the page.");
      return;
    }

    if (Object.keys(fileTree).length === 0) {
      alert("Please wait for AI to generate code first");
      return;
    }

    try {
      setIsRunning(true);

      // 🔧 DEBUG: Log fileTree structure
      console.log("📦 FileTree being mounted:", JSON.stringify(fileTree, null, 2));

      // Mount the file tree to web container
      console.log("📦 Mounting file tree to WebContainer...");
      await webContainer.mount(fileTree);

      // 🔧 VERIFY: Check what files were mounted
      const mountedFiles = await webContainer.fs.readdir("/");
      console.log("✅ Files mounted in root:", mountedFiles);

      // 🔧 VERIFY: Check if package.json exists
      if (!mountedFiles.includes("package.json")) {
        console.error("❌ package.json not found in mounted files!");
        alert("Error: package.json not found. The AI may have generated an incorrect file structure.");
        setIsRunning(false);
        return;
      }

      // Read and verify package.json
      try {
        const packageJsonContent = await webContainer.fs.readFile("/package.json", "utf-8");
        console.log("✅ package.json content:", packageJsonContent);
      } catch (err) {
        console.error("❌ Could not read package.json:", err);
        alert("Error: Could not read package.json");
        setIsRunning(false);
        return;
      }

      // Run npm install
      console.log("📥 Running npm install...");
      const installProcess = await webContainer.spawn("npm", ["install"]);

      let installOutput = "";
      installProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            console.log("Install:", chunk);
            installOutput += chunk;
          },
        })
      );

      const installExitCode = await installProcess.exit;
      console.log(`✅ npm install completed with exit code: ${installExitCode}`);

      if (installExitCode !== 0) {
        console.error("❌ npm install failed with exit code:", installExitCode);
        alert("npm install failed. Check console for details.");
        setIsRunning(false);
        return;
      }

      // Kill previous process if running
      if (runProcess) {
        console.log("🛑 Killing previous process...");
        runProcess.kill();
      }

      // Run npm start
      console.log("🚀 Running npm start...");
      const tempRunProcess = await webContainer.spawn("npm", ["start"]);

      tempRunProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            console.log("Start:", chunk);
          },
        })
      );

      setRunProcess(tempRunProcess);

      // Note: server-ready event listener is already set up in useEffect
      console.log("⏳ Waiting for server-ready event...");

    } catch (error) {
      console.error("❌ Error running project:", error);
      alert(`Failed to run project: ${error.message}\n\nCheck console for details.`);
    } finally {
      setIsRunning(false);
    }
  };

  // ⭐ NEW FUNCTION: Copy code to clipboard
  const handleCopyCode = () => {
    if (!currentContent) {
      alert("No code to copy!");
      return;
    }

    navigator.clipboard
      .writeText(currentContent)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy code");
      });
  };

  // ⭐ NEW FUNCTION: Test WebContainer (for debugging)
  const testWebContainer = async () => {
    if (!webContainer) {
      alert("WebContainer not initialized!");
      return;
    }

    const testTree = {
      "package.json": {
        file: {
          contents: JSON.stringify(
            {
              name: "test-app",
              version: "1.0.0",
              scripts: {
                start: "node server.js",
              },
            },
            null,
            2
          ),
        },
      },
      "server.js": {
        file: {
          contents: `
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Hello from WebContainer Test!</h1><p>If you see this, WebContainer works!</p>');
});
server.listen(3000, () => {
  console.log('Test server running on port 3000');
});
          `.trim(),
        },
      },
    };

    try {
      console.log("🧪 Testing WebContainer with simple server...");
      await webContainer.mount(testTree);

      const files = await webContainer.fs.readdir("/");
      console.log("✅ Test files mounted:", files);

      const proc = await webContainer.spawn("node", ["server.js"]);
      proc.output.pipeTo(
        new WritableStream({
          write(chunk) {
            console.log("Test server:", chunk);
          },
        })
      );

      alert("Test server started! Check console for output.");
    } catch (err) {
      console.error("❌ Test failed:", err);
      alert("Test failed: " + err.message);
    }
  };

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
          {/* 🔧 MODIFIED: Added Run button and Test button in header */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">
              {currentFile || "Select a file"}
            </h3>

            <div className="flex gap-2">
              {/* ⭐ NEW: Test Button (for debugging) */}
              <button
                onClick={testWebContainer}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center gap-1"
                title="Test WebContainer with a simple server"
              >
                <i className="ri-flask-line"></i>
                Test
              </button>

              {/* ⭐ NEW: Run Button */}
              <button
                onClick={handleRunProject}
                disabled={isRunning || Object.keys(fileTree).length === 0}
                className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {isRunning ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Running...
                  </>
                ) : (
                  <>
                    <i className="ri-play-fill"></i>
                    Run
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 🔧 MODIFIED: Added relative position for copy button */}
          <div className="relative flex-grow">
            <pre className="code-scroll bg-gray-900 text-green-300 p-3 rounded h-full overflow-auto whitespace-pre overflow-x-auto">
              <code className="block min-w-max">
                {currentContent || "// AI generated code will appear here"}
              </code>
            </pre>

            {/* ⭐ NEW: Copy Button (bottom right corner) */}
            {currentContent && (
              <button
                onClick={handleCopyCode}
                className={`absolute bottom-4 right-4 px-3 py-2 rounded-lg shadow-lg transition-all duration-200 ${
                  copySuccess
                    ? "bg-green-500 text-white"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {copySuccess ? (
                  <>
                    <i className="ri-check-line mr-1"></i>
                    Copied!
                  </>
                ) : (
                  <>
                    <i className="ri-file-copy-line mr-1"></i>
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

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

        {/* ⭐ NEW: Iframe Preview Panel (appears when iframeUrl is set) */}
        {iframeUrl && webContainer && (
          <div className="flex min-w-96 flex-col h-full border-l-2 border-gray-300">
            {/* Address bar */}
            <div className="address-bar bg-gray-100 p-2 flex items-center gap-2">
              <span className="text-sm text-gray-600">Preview:</span>
              <input
                type="text"
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
                className="flex-grow px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => {
                  setIframeUrl(null);
                  if (runProcess) {
                    runProcess.kill();
                    setRunProcess(null);
                  }
                }}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            {/* Iframe */}
            <iframe
              src={iframeUrl}
              className="w-full h-full bg-white"
              title="Preview"
            ></iframe>
          </div>
        )}
      </section>
    </main>
  );
};

export default ProjectPage;











{iframeUrl && webContainer && (
          <div className="flex min-w-96 flex-col h-full border-l-2 border-gray-300">
            {/* Address bar */}
            <div className="address-bar bg-gray-100 p-2 flex items-center gap-2">
              <span className="text-sm text-gray-600">Preview:</span>
              <input
                type="text"
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
                className="flex-grow px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => {
                  setIframeUrl(null);
                  if (runProcess) {
                    runProcess.kill();
                    setRunProcess(null);
                  }
                }}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            {/* Iframe */}
            <iframe
              src={iframeUrl}
              className="w-full h-full bg-white"
              title="Preview"
            ></iframe>
          </div>
        )}