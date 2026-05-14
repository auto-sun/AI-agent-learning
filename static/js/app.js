

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
const chunkBox = document.querySelector("#chunkBox");
const similarText1 = document.querySelector("#similarText1");
const similarText2 = document.querySelector("#similarText2");
const similarityBtn = document.querySelector("#similarityBtn");
const similarityBox = document.querySelector("#similarityBox");
const chunkEmbeddingBtn = document.querySelector("#chunkEmbeddingBtn");
const chunkEmbeddingBox = document.querySelector("#chunkEmbeddingBox");
let currentText = "";
let currentChunks = [];
let currentChunkEmbeddings = [];
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

    if (!chunks || chunks.length === 0) {
        chunkBox.innerText = "没有切分结果";
        return;
    }

    for (let i = 0; i < chunks.length; i++) {
        const div = document.createElement("div");
        div.classList.add("chunk-item");

        const title = document.createElement("div");
        title.classList.add("chunk-title");
        title.innerText = "Chunk " + (i + 1);

        const content = document.createElement("div");
        content.innerText = chunks[i];

        div.appendChild(title);
        div.appendChild(content);

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

        currentChunks = data.chunks || [];
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


async function compareSimilarity() {
    try {
        const text1 = similarText1.value.trim();
        const text2 = similarText2.value.trim();

        if (text1 === "") {
            result.innerText = "请输入文本1";
            return;
        }
        if (text2 === "") {
            result.innerText = "请输入文本2";
            return;
        }

        similarityBtn.disabled = true;
        similarityBtn.innerText = "计算中...";
        result.innerText = "正在计算相似度...";
        similarityBox.innerText = "计算中，请稍等...";

        const response = await fetch("/users/similarity", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text1: text1,
                text2: text2
            })
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }
        if (!response.ok) {
            result.innerText = data.detail || `计算相似度失败，状态码：${response.status}`;
            similarityBox.innerText = data.detail || "计算相似度失败";
            return;
        }

        const score = data.similarity;
        if (typeof score !== "number") {
            throw new Error("后端没有返回有效的 similarity 数值");
        }
        result.innerText = "相似度计算成功";

        similarityBox.innerText =
            "相似度分数：" + score.toFixed(4) + "\n" +
            "向量维度：" + data.embedding_dimension + "\n\n" +
            "文本1：" + data.text1_preview + "\n" +
            "文本2：" + data.text2_preview;
    }
    catch (error) {
        console.error("计算相似度失败：", error);
        result.innerText = "网络错误，计算相似度失败";
        similarityBox.innerText = "网络错误，计算相似度失败：" + error.message;
    }
    finally {
        similarityBtn.disabled = false;
        similarityBtn.innerText = "计算相似度";
    }
}


async function generateChunkEmbeddings() {
    try {
        if (currentChunks.length === 0) {
            result.innerText = "请先完成文本切分";
            return;
        }

        chunkEmbeddingBtn.disabled = true;
        chunkEmbeddingBtn.innerText = "生成中...";
        result.innerText = "正在为 chunks 生成 embeddings...";
        chunkEmbeddingBox.innerText = "生成中，请稍等...";

        const response = await fetch("/users/chunk-embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chunks: currentChunks
            })
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            result.innerText = data.detail || `生成 embeddings 失败，状态码：${response.status}`;
            chunkEmbeddingBox.innerText = data.detail || "生成 embeddings 失败";
            return;
        }

        currentChunkEmbeddings = data.items || [];

        result.innerText = "Chunk embeddings 生成成功，共 " + data.count + " 段";

        chunkEmbeddingBox.innerText =
            "生成成功\n" +
            "chunk 数量：" + data.count + "\n" +
            "向量维度：" + data.embedding_dimension + "\n\n" +
            "已保存到 currentChunkEmbeddings，下一课会用它来做相似度检索。";

    } catch (error) {
        console.log("生成 chunk embeddings 失败：", error);
        result.innerText = "网络错误，生成 chunk embeddings 失败";
        chunkEmbeddingBox.innerText = "网络错误，生成 chunk embeddings 失败";
    } finally {
        chunkEmbeddingBtn.disabled = false;
        chunkEmbeddingBtn.innerText = "生成 Chunk Embeddings";
    }
}
chunkEmbeddingBtn.addEventListener("click", generateChunkEmbeddings);
similarityBtn.addEventListener("click", compareSimilarity);
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
