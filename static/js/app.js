

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
const useCurrentTextBtn = document.querySelector("#useCurrentTextBtn");
const addRagTextBtn = document.querySelector("#addRagTextBtn");
const ragTextInput = document.querySelector("#ragTextInput");
const ragTextInfo = document.querySelector("#ragTextInfo");
const ragStoreBox = document.querySelector("#ragStoreBox");
const ragFileSelect = document.querySelector("#ragFileSelect");
const refreshRagFilesBtn = document.querySelector("#refreshRagFilesBtn");
const addRagFileBtn = document.querySelector("#addRagFileBtn");
const ragUploadFileInput = document.querySelector("#ragUploadFileInput");
const uploadAndAddRagBtn = document.querySelector("#uploadAndAddRagBtn");
const ragFileBox = document.querySelector("#ragFileBox");
const ragQuestionInput = document.querySelector("#ragQuestionInput");
const ragAskBtn = document.querySelector("#ragAskBtn");
const ragAnswerBox = document.querySelector("#ragAnswerBox");
const ragReferenceBox = document.querySelector("#ragReferenceBox");
const ragSearchInput = document.querySelector("#ragSearchInput");
const ragSearchBtn = document.querySelector("#ragSearchBtn");
const ragSearchBox = document.querySelector("#ragSearchBox");
let currentText = "";
let currentChunks = [];
const RAG_CHUNK_SIZE = 500;
const RAG_OVERLAP = 100;
const RAG_MAX_CHUNKS = 120;
const RAG_SCORE_THRESHOLD = 0.55;
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
function renderRagFileOptions(files) {
    ragFileSelect.innerHTML = "";

    if (!files || files.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.innerText = "暂无 txt 文件";
        ragFileSelect.appendChild(option);
        ragFileSelect.disabled = true;
        addRagFileBtn.disabled = true;
        return;
    }

    ragFileSelect.disabled = false;
    addRagFileBtn.disabled = false;

    for (const fileName of files) {
        const option = document.createElement("option");
        option.value = fileName;
        option.innerText = fileName;
        ragFileSelect.appendChild(option);
    }
}
async function loadRagFiles() {
    try {
        const response = await fetch("/rag/files");
        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            ragFileBox.innerText = data.detail || `获取 RAG 文件列表失败，状态码：${response.status}`;
            renderRagFileOptions([]);
            return;
        }

        renderRagFileOptions(data.files || []);
    } catch (error) {
        console.log("获取 RAG 文件列表失败: ", error);
        ragFileBox.innerText = "网络错误，获取 RAG 文件列表失败";
        renderRagFileOptions([]);
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
        await loadRagFiles();
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


function useCurrentTextForRag() {
    const text = currentText.trim();
    if (text === "") {
        result.innerText = "请先上传 txt 文件";
        return;
    }

    ragTextInput.value = text;
    updateRagTextInfo();
    result.innerText = "已填入当前上传文本";
}

function estimateChunkCount(text) {
    const cleanText = text.trim();
    if (cleanText === "") {
        return 0;
    }

    let count = 0;
    let start = 0;
    const textLength = cleanText.length;

    while (start < textLength) {
        count += 1;
        const end = start + RAG_CHUNK_SIZE;

        if (end >= textLength) {
            break;
        }

        start = end - RAG_OVERLAP;
    }

    return count;
}

function updateRagTextInfo() {
    const text = ragTextInput.value.trim();
    const chunkCount = estimateChunkCount(text);
    ragTextInfo.innerText = "当前字数：" + text.length + "，预计 chunk 数：" + chunkCount;

    if (chunkCount > RAG_MAX_CHUNKS) {
        ragTextInfo.innerText += "，超过当前学习版上限 " + RAG_MAX_CHUNKS;
    }
}

function formatScore(score) {
    const numberScore = Number(score);
    if (!Number.isFinite(numberScore)) {
        return "无";
    }

    return numberScore.toFixed(4);
}

function renderRagResultList(container, items, titlePrefix, emptyText) {
    container.innerHTML = "";

    if (!items || items.length === 0) {
        container.innerText = emptyText;
        return;
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const div = document.createElement("div");
        div.classList.add("reference-item");

        const title = document.createElement("div");
        title.classList.add("reference-title");
        title.innerText = titlePrefix + " " + (i + 1) + "，相似度：" + formatScore(item.score);

        const content = document.createElement("div");
        content.innerText = item.content || "";

        div.appendChild(title);
        div.appendChild(content);
        container.appendChild(div);
    }
}

function renderRagReferences(references) {
    renderRagResultList(ragReferenceBox, references, "参考片段", "暂无参考片段");
}

async function addRagText() {
    try {
        const text = ragTextInput.value.trim();
        const chunkCount = estimateChunkCount(text);

        if (text === "") {
            result.innerText = "请输入要加入知识库的文本";
            return;
        }

        if (chunkCount > RAG_MAX_CHUNKS) {
            result.innerText = "文本太长，请分多次添加";
            ragStoreBox.innerText =
                "当前预计 chunk 数：" + chunkCount + "\n" +
                "当前学习版最多支持：" + RAG_MAX_CHUNKS + "\n" +
                "建议先截取一部分文本，或者把文档拆成几次添加。";
            return;
        }

        addRagTextBtn.disabled = true;
        addRagTextBtn.innerText = "添加中...";
        result.innerText = "正在添加到知识库...";
        ragStoreBox.innerText = "添加中，请稍等...";

        const response = await fetch("/rag/add-text", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: text,
                chunk_size: RAG_CHUNK_SIZE,
                overlap: RAG_OVERLAP
            })
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            result.innerText = data.detail || `添加失败，状态码：${response.status}`;
            ragStoreBox.innerText = data.detail || "添加失败";
            return;
        }

        result.innerText = "知识库添加成功";
        ragStoreBox.innerText =
            data.message + "\n" +
            "文本字数：" + data.text_length + "\n" +
            "本次添加 chunk 数：" + data.chunk_count + "\n" +
            "知识库总 chunk 数：" + data.total_chunks;
    } catch (error) {
        console.log("添加知识库失败：", error);
        result.innerText = "网络错误，添加知识库失败";
        ragStoreBox.innerText = "网络错误，添加知识库失败";
    } finally {
        addRagTextBtn.disabled = false;
        addRagTextBtn.innerText = "添加到知识库";
    }
}

function renderRagAddResult(container, data) {
    const lines = [];

    if (data.filename) {
        lines.push("文件：" + data.filename);
    }

    lines.push("添加结果：" + (data.message || "添加成功"));

    if (data.text_length !== undefined) {
        lines.push("文本字数：" + data.text_length);
    }

    if (data.chunk_count !== undefined) {
        lines.push("本次添加 chunk 数：" + data.chunk_count);
    }

    if (data.total_chunks !== undefined) {
        lines.push("知识库总 chunk 数：" + data.total_chunks);
    }

    container.innerText = lines.join("\n");
}

async function addSelectedRagFile() {
    try {
        const filename = ragFileSelect.value;

        if (!filename) {
            result.innerText = "请先选择一个 txt 文件";
            return;
        }

        addRagFileBtn.disabled = true;
        addRagFileBtn.innerText = "添加中...";
        result.innerText = "正在把文件加入知识库...";
        ragFileBox.innerText = "添加中，请稍等...";

        const response = await fetch("/rag/add-file", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                filename: filename,
                chunk_size: RAG_CHUNK_SIZE,
                overlap: RAG_OVERLAP
            })
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            result.innerText = data.detail || `文件加入失败，状态码：${response.status}`;
            ragFileBox.innerText = data.detail || "文件加入失败";
            return;
        }

        result.innerText = "文件已加入知识库";
        renderRagAddResult(ragFileBox, data);
    } catch (error) {
        console.log("文件加入知识库失败：", error);
        result.innerText = "网络错误，文件加入知识库失败";
        ragFileBox.innerText = "网络错误，文件加入知识库失败";
    } finally {
        addRagFileBtn.disabled = ragFileSelect.disabled;
        addRagFileBtn.innerText = "选择文件加入知识库";
    }
}

async function uploadAndAddRagFile() {
    try {
        const file = ragUploadFileInput.files[0];

        if (!file) {
            result.innerText = "请先选择要上传的 txt 文件";
            return;
        }

        if (!file.name.toLowerCase().endsWith(".txt")) {
            result.innerText = "现在只允许上传 txt 文件";
            return;
        }

        uploadAndAddRagBtn.disabled = true;
        uploadAndAddRagBtn.innerText = "上传中...";
        result.innerText = "正在上传并加入知识库...";
        ragFileBox.innerText = "上传并添加中，请稍等...";

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
            "/rag/upload-and-add?chunk_size=" + RAG_CHUNK_SIZE + "&overlap=" + RAG_OVERLAP,
            {
                method: "POST",
                body: formData
            }
        );

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            result.innerText = data.detail || `上传并加入失败，状态码：${response.status}`;
            ragFileBox.innerText = data.detail || "上传并加入失败";
            return;
        }

        result.innerText = "上传并加入知识库成功";
        ragUploadFileInput.value = "";
        renderRagAddResult(ragFileBox, data);
        await loadFiles();
        await loadRagFiles();
    } catch (error) {
        console.log("上传并加入知识库失败：", error);
        result.innerText = "网络错误，上传并加入知识库失败";
        ragFileBox.innerText = "网络错误，上传并加入知识库失败";
    } finally {
        uploadAndAddRagBtn.disabled = false;
        uploadAndAddRagBtn.innerText = "上传并加入知识库";
    }
}

async function askRag() {
    try {
        const question = ragQuestionInput.value.trim();

        if (question === "") {
            result.innerText = "请输入知识库问题";
            return;
        }

        ragAskBtn.disabled = true;
        ragAskBtn.innerText = "提问中...";
        result.innerText = "AI 正在检索知识库...";
        ragAnswerBox.innerText = "正在回答，请稍等...";
        ragReferenceBox.innerText = "正在检索参考片段...";

        const response = await fetch("/rag/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: question,
                top_k: 3,
                score_threshold: RAG_SCORE_THRESHOLD
            })
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            result.innerText = data.detail || `知识库提问失败，状态码：${response.status}`;
            ragAnswerBox.innerText = data.detail || "知识库提问失败";
            ragReferenceBox.innerText = "暂无参考片段";
            return;
        }

        const maxScore = formatScore(data.max_score);
        const threshold = formatScore(data.score_threshold);

        if (data.is_answerable === false) {
            result.innerText = "检索相关度不足，已停止硬答";
        } else {
            result.innerText = "知识库问答完成";
        }

        ragAnswerBox.innerText =
            "最高相似度：" + maxScore + "，阈值：" + threshold + "\n\n" +
            (data.answer || "没有返回回答");

        renderRagReferences(data.references);

        ragQuestionInput.value = "";
    } catch (error) {
        console.log("知识库提问失败：", error);
        result.innerText = "网络错误，知识库提问失败";
        ragAnswerBox.innerText = "网络错误，知识库提问失败";
        ragReferenceBox.innerText = "暂无参考片段";
    } finally {
        ragAskBtn.disabled = false;
        ragAskBtn.innerText = "知识库提问";
    }
}

async function searchRag() {
    try {
        const query = ragSearchInput.value.trim();

        if (query === "") {
            result.innerText = "请输入检索关键词";
            return;
        }

        ragSearchBtn.disabled = true;
        ragSearchBtn.innerText = "搜索中...";
        result.innerText = "正在搜索知识库片段...";
        ragSearchBox.innerText = "搜索中，请稍等...";

        const response = await fetch("/rag/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: query,
                top_k: 3
            })
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            result.innerText = data.detail || `搜索失败，状态码：${response.status}`;
            ragSearchBox.innerText = data.detail || "搜索失败";
            return;
        }

        result.innerText = "搜索完成";

        renderRagResultList(
            ragSearchBox,
            data.results,
            "搜索结果",
            "暂无搜索结果"
        );

        ragSearchInput.value = "";
    } catch (error) {
        console.log("搜索知识库失败：", error);
        result.innerText = "网络错误，搜索知识库失败";
        ragSearchBox.innerText = "网络错误，搜索知识库失败";
    } finally {
        ragSearchBtn.disabled = false;
        ragSearchBtn.innerText = "搜索片段";
    }
}


refreshRagFilesBtn.addEventListener("click", loadRagFiles);
addRagFileBtn.addEventListener("click", addSelectedRagFile);
uploadAndAddRagBtn.addEventListener("click", uploadAndAddRagFile);
useCurrentTextBtn.addEventListener("click", useCurrentTextForRag);
addRagTextBtn.addEventListener("click", addRagText);
ragAskBtn.addEventListener("click", askRag);
ragSearchBtn.addEventListener("click", searchRag);
ragTextInput.addEventListener("input", updateRagTextInfo);
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
ragQuestionInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        askRag();
    }
});
ragSearchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchRag();
    }
});
loadFiles();
loadRagFiles();
