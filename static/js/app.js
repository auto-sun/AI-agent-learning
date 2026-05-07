

const questionInput = document.querySelector("#questionInput");
const sendBtn = document.querySelector("#sendBtn");
const result = document.querySelector("#result");
const chatBox = document.querySelector("#chatBox");
const fileInput = document.querySelector("#fileInput");
const uploadBtn = document.querySelector("#uploadBtn");
const textPreview = document.querySelector("#textPreview");
const fileList = document.querySelector("#fileList");
const summaryBtn = document.querySelector("#summaryBtn");
const summaryBox = document.querySelector("#summaryBox");
const docQuestionInput = document.querySelector("#docQuestionInput");
const docAskBtn = document.querySelector("#docAskBtn");
const docAnswerBox = document.querySelector("#docAnswerBox");
const chunkBtn = document.querySelector("#chunkBtn");
const chunkBox = document.querySelector("#chunkBox"); let currentText = "";
function scrollToBottom(func) {
    func.scrollTop = func.scrollHeight;
    // console.log(chatBox.scrollHeight);
}
function appendMessage(role, text) {
    const p = document.createElement("p");
    p.classList.add("msg");
    if (role === "user") {
        p.classList.add("user-msg");
        p.innerText = "我：" + text;
    } else if (role === "loading") {
        p.classList.add("loading-msg");
        p.innerText = "AI: " + text;
    }
    else {
        p.classList.add("ai-msg");
        p.innerText = "AI: " + text;
    }
    chatBox.appendChild(p);
    scrollToBottom(chatBox);
    return p;
}
function renderFileList(files) {
    fileList.innerHTML = "";
    for (const fileName of files) {
        const li = document.createElement("li")
        const a = document.createElement("a");
        a.innerText = fileName;
        a.href = "/uploads/" + encodeURIComponent(fileName);
        a.target = "_blank";
        li.appendChild(a);
        fileList.appendChild(li);
    }
}
async function loadFiles() {
    try {
        const response = await fetch("/users/files");
        const data = await response.json();
        renderFileList(data.files)
    } catch (error) {
        console.log("获取列表失败: ", error);
    }
}
async function sendQuestion() {
    try {
        const text = questionInput.value.trim();
        if (text === "") {
            result.innerText = "请输入内容";
            return;
        }
        sendBtn.disabled = true;
        sendBtn.innerText = "发送中";
        result.innerText = "AI 正在思考...";
        appendMessage("user", text);
        questionInput.value = "";
        const loadingElement = appendMessage("loading", "正在思考...");
        const response = await fetch("/users/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: text
            })
        });
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        if (!response.ok) {
            result.innerText = data.detail || `请求失败,状态码:${response.status}`;
            loadingElement.className = "msg ai-msg";
            loadingElement.innerText = "AI:" + (data.detail || "请求失败");
            scrollToBottom(chatBox);
            return;
        }
        result.innerText = "发送成功";
        loadingElement.className = "msg ai-msg";
        loadingElement.innerText = "AI:" + data.msg;
        scrollToBottom(chatBox);
    } catch (error) {
        console.log("发送问题失败:", error);
        result.innerText = "网络失败，无法连接后端";
        appendMessage("ai", "网络错误，无法连接后端");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerText = "发送";
    }
}
async function uploadFile() {
    try {
        const file = fileInput.files[0];
        if (!file) {
            result.innerText = "请先选择文件";
            return;
        }
        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith(".txt")) {
            result.innerText = "现在只允许上传 txt 文件";
            return;
        }
        uploadBtn.disabled = true;
        uploadBtn.innerText = "上传中...";
        result.innerText = "文件上传中...";
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/users/upload", {
            method: "POST",
            body: formData
        });
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        if (!response.ok) {
            result.innerText = data.detail || `上传失败，状态码：${response.status}`;
            return;
        }
        result.innerText = data.msg;
        currentText = data.text || "";
        textPreview.innerText = currentText;
        fileInput.value = "";
        await loadFiles();
    } catch (error) {
        console.log("上传失败：", error);
        result.innerText = "网络错误，上传失败";
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerText = "上传文件";
    }
}
async function summarizeText() {
    try {
        const text = currentText.trim();
        if (text === "" || text === "这里显示 txt 内容") {
            result.innerText = "请先上传 txt 文件";
            return;
        }
        summaryBtn.disabled = true;
        summaryBtn.innerText = "总结中...";
        result.innerText = "AI 正在总结文档...";
        summaryBox.innerText = "总结中，请稍等...";
        const response = await fetch("/users/summarize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text
            })
        });
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        if (!response.ok) {
            result.innerText = data.detail || `总结失败，状态码：${response.status}`;
            summaryBox.innerText = data.detail || "总结失败";
            return;
        }
        result.innerText = "总结成功";
        summaryBox.innerText = data.summary;
    } catch (error) {
        console.log("总结失败：", error);
        result.innerText = "网络错误，总结失败";
        summaryBox.innerText = "网络错误，总结失败";
    } finally {
        summaryBtn.disabled = false;
        summaryBtn.innerText = "总结文档";
    }
}
async function askDocument() {
    try {
        const question = docQuestionInput.value.trim();
        if (currentText.trim() === "") {
            result.innerText = "请先上传 txt 文件";
            return;
        }
        if (question === "") {
            result.innerText = "请输入关于文档的问题";
            return;
        }
        docAskBtn.disabled = true;
        docAskBtn.innerText = "提问中...";
        result.innerText = "AI 正在根据文档回答...";
        docAnswerBox.innerText = "正在回答，请稍等...";
        const response = await fetch("/users/doc-ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: currentText,
                question: question
            })
        });
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        if (!response.ok) {
            result.innerText = data.detail || `文档问答失败，状态码：${response.status}`;
            docAnswerBox.innerText = data.detail || "文档问答失败";
            return;
        }
        result.innerText = "文档问答成功";
        docAnswerBox.innerText = data.answer;
        docQuestionInput.value = "";
    } catch (error) {
        console.log("文档问答失败：", error);
        result.innerText = "网络错误，文档问答失败";
        docAnswerBox.innerText = "网络错误，文档问答失败";
    } finally {
        docAskBtn.disabled = false;
        docAskBtn.innerText = "提问文档";
    }
}
function renderChunks(chunks) {
    chunkBox.innerHTML = "";
    for (let i = 0; i < chunks.length; i++) {
        const div = document.createElement("div");
        div.classList.add("chunk-item");
        div.innerText = "Chunk " + (i + 1) + "：\n" + chunks[i];
        chunkBox.appendChild(div);
    }
}
async function splitCurrentText() {
    try {
        const text = currentText.trim();
        if (text === "") {
            result.innerText = "请先上传 txt 文件";
            return;
        }
        chunkBtn.disabled = true;
        chunkBtn.innerText = "切分中...";
        result.innerText = "正在切分文本...";
        chunkBox.innerText = "切分中，请稍等...";
        const response = await fetch("/users/chunks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text,
                chunk_size: 500,
                overlap: 100
            })
        });
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        if (!response.ok) {
            result.innerText = data.detail || `文本切分失败，状态码：${response.status}`;
            chunkBox.innerText = data.detail || "文本切分失败";
            return;
        }
        result.innerText = "文本切分成功，共 " + data.chunk_count + " 段";
        renderChunks(data.chunks);
    } catch (error) {
        console.log("文本切分失败：", error);
        result.innerText = "网络错误，文本切分失败";
        chunkBox.innerText = "网络错误，文本切分失败";
    } finally {
        chunkBtn.disabled = false;
        chunkBtn.innerText = "文本切分";
    }
}
chunkBtn.addEventListener("click", splitCurrentText);
docAskBtn.addEventListener("click", askDocument);
summaryBtn.addEventListener("click", summarizeText);
sendBtn.addEventListener("click", sendQuestion);
uploadBtn.addEventListener("click", uploadFile);
docQuestionInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        askDocument();
    }
});
questionInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        sendQuestion();
    }
});
loadFiles();
