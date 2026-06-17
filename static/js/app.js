

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
const ragSourceNameInput = document.querySelector("#ragSourceNameInput");
const allowDuplicateInput = document.querySelector("#allowDuplicateInput");
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
const refreshDocumentRecordsBtn = document.querySelector("#refreshDocumentRecordsBtn");
const documentRecordBox = document.querySelector("#documentRecordBox");
const refreshQaRecordsBtn = document.querySelector("#refreshQaRecordsBtn");
const qaRecordBox = document.querySelector("#qaRecordBox");
let currentText = "";
let currentFilename = "";
let currentChunks = [];
const RAG_CHUNK_SIZE = 500;
const RAG_OVERLAP = 100;
const RAG_MAX_CHUNKS = 120;
const RAG_SCORE_THRESHOLD = 0.55;
const RAG_SUPPORTED_EXTENSIONS = [".txt", ".md", ".pdf", ".docx"];
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
        option.innerText = "暂无支持的文档文件";
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

function isSupportedRagFileName(fileName) {
    const lowerName = fileName.toLowerCase();
    return RAG_SUPPORTED_EXTENSIONS.some(function (extension) {
        return lowerName.endsWith(extension);
    });
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
        currentFilename = data.filename || "";
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
    ragSourceNameInput.value = currentFilename || "当前上传文本";
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

function formatNullable(value) {
    if (value === undefined || value === null || value === "") {
        return "无";
    }

    return String(value);
}

function formatYesNo(value) {
    if (value === undefined || value === null) {
        return "无";
    }

    return value ? "是" : "否";
}

function formatRagMeta(item) {
    const meta = [];

    if (item.source_name) {
        meta.push("来源：" + item.source_name);
    }

    if (item.source_type) {
        meta.push("类型：" + item.source_type);
    }

    if (item.chunk_index !== undefined && item.chunk_index !== -1) {
        meta.push("chunk_index：" + item.chunk_index);
    }

    if (item.chunk_id !== undefined) {
        meta.push("chunk_id：" + item.chunk_id);
    }

    if (item.created_at) {
        meta.push("时间：" + item.created_at);
    }

    return meta.join("，");
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

        const metaText = formatRagMeta(item);
        if (metaText) {
            title.innerText += "，" + metaText;
        }

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

function getRagSourceName() {
    const sourceName = ragSourceNameInput.value.trim();
    return sourceName || "手动输入文本";
}

function isDuplicateAllowed() {
    return allowDuplicateInput.checked;
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
                overlap: RAG_OVERLAP,
                source_name: getRagSourceName(),
                allow_duplicate: isDuplicateAllowed()
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

        if (data.duplicate) {
            result.innerText = "检测到重复内容，已按后端去重规则处理";
        } else {
            result.innerText = "知识库添加成功";
        }

        renderRagAddResult(ragStoreBox, data);
        await loadDocumentRecords();
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

    if (data.document_record_id !== undefined) {
        lines.push("入库记录ID：" + data.document_record_id);
    }

    if (data.filename) {
        lines.push("文件：" + data.filename);
    }

    if (data.source_name) {
        lines.push("来源名称：" + data.source_name);
    }

    if (data.source_type) {
        lines.push("来源类型：" + data.source_type);
    }

    if (data.file_type) {
        lines.push("文件类型：" + data.file_type);
    }

    if (data.file_suffix) {
        lines.push("文件后缀：" + data.file_suffix);
    }

    lines.push("添加结果：" + (data.message || "添加成功"));

    if (data.duplicate !== undefined) {
        lines.push("是否重复：" + (data.duplicate ? "是" : "否"));
    }

    if (data.text_length !== undefined) {
        lines.push("文本字数：" + data.text_length);
    }

    if (data.parsed_text_length !== undefined) {
        lines.push("解析文本字数：" + data.parsed_text_length);
    }

    if (data.original_chunk_count !== undefined) {
        lines.push("原始 chunk 数：" + data.original_chunk_count);
    }

    if (data.chunk_count !== undefined) {
        lines.push("实际新增 chunk 数：" + data.chunk_count);
    }

    if (data.skipped_duplicate_chunks !== undefined) {
        lines.push("跳过重复 chunk 数：" + data.skipped_duplicate_chunks);
    }

    if (data.total_chunks !== undefined) {
        lines.push("知识库总 chunk 数：" + data.total_chunks);
    }

    if (data.source_hash) {
        lines.push("source_hash：" + data.source_hash);
    }

    if (data.duplicated_source_name) {
        lines.push("重复来源名称：" + data.duplicated_source_name);
    }

    if (data.duplicated_source_type) {
        lines.push("重复来源类型：" + data.duplicated_source_type);
    }

    if (data.duplicated_created_at) {
        lines.push("重复来源添加时间：" + data.duplicated_created_at);
    }

    if (data.added_chunk_ids && data.added_chunk_ids.length > 0) {
        lines.push("新增 chunk_id：" + data.added_chunk_ids.join(", "));
    }

    container.innerText = lines.join("\n");
}

async function addSelectedRagFile() {
    try {
        const filename = ragFileSelect.value;

        if (!filename) {
            result.innerText = "请先选择一个支持的文档文件";
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
                overlap: RAG_OVERLAP,
                source_name: filename,
                allow_duplicate: isDuplicateAllowed()
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

        if (data.duplicate) {
            result.innerText = "检测到重复文件内容，已按后端去重规则处理";
        } else {
            result.innerText = "文件已加入知识库";
        }

        renderRagAddResult(ragFileBox, data);
        await loadDocumentRecords();
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
            result.innerText = "请先选择要上传的文档文件";
            return;
        }

        if (!isSupportedRagFileName(file.name)) {
            result.innerText = "现在只允许上传 txt、md、pdf、docx 文件";
            return;
        }

        uploadAndAddRagBtn.disabled = true;
        uploadAndAddRagBtn.innerText = "上传中...";
        result.innerText = "正在上传并加入知识库...";
        ragFileBox.innerText = "上传并添加中，请稍等...";

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(
            "/rag/upload-and-add?chunk_size=" + RAG_CHUNK_SIZE +
            "&overlap=" + RAG_OVERLAP +
            "&allow_duplicate=" + isDuplicateAllowed(),
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

        if (data.duplicate) {
            result.innerText = "上传内容重复，已按后端去重规则处理";
        } else {
            result.innerText = "上传并加入知识库成功";
        }

        ragUploadFileInput.value = "";
        renderRagAddResult(ragFileBox, data);
        await loadFiles();
        await loadRagFiles();
        await loadDocumentRecords();
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
            "问答记录ID：" + formatNullable(data.qa_record_id) + "\n" +
            "最高相似度：" + maxScore + "，阈值：" + threshold + "\n\n" +
            (data.answer || "没有返回回答");

        renderRagReferences(data.references);
        await loadQaRecords();

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

function renderDocumentRecords(documents) {
    documentRecordBox.innerHTML = "";

    if (!documents || documents.length === 0) {
        documentRecordBox.innerText = "暂无文档入库记录";
        return;
    }

    for (let i = 0; i < documents.length; i++) {
        const item = documents[i];
        const div = document.createElement("div");
        div.classList.add("reference-item");

        const heading = document.createElement("div");
        heading.classList.add("record-heading");

        const title = document.createElement("div");
        title.classList.add("reference-title");
        title.innerText =
            "记录 #" + formatNullable(item.id) +
            "，来源：" + formatNullable(item.source_name) +
            "，类型：" + formatNullable(item.source_type);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.classList.add("danger-button");
        deleteButton.innerText = item.is_deleted ? "已删除" : "删除";
        deleteButton.disabled = item.is_deleted === true;
        deleteButton.addEventListener("click", function () {
            deleteDocumentRecord(item.id);
        });

        heading.appendChild(title);
        heading.appendChild(deleteButton);

        const originalChunkCount = item.original_chunk_count ?? item.orginal_chunk_count;
        const skippedDuplicateChunks = item.skipped_duplicate_chunks ?? item.skipped_duplicate_counts;

        const content = document.createElement("div");
        const lines = [
            "文件：" + formatNullable(item.filename),
            "文件类型：" + formatNullable(item.file_type),
            "文件后缀：" + formatNullable(item.file_suffix),
            "添加结果：" + formatNullable(item.message),
            "是否重复：" + formatYesNo(item.duplicate),
            "原始 chunk 数：" + formatNullable(originalChunkCount),
            "实际新增 chunk 数：" + formatNullable(item.chunk_count),
            "跳过重复 chunk 数：" + formatNullable(skippedDuplicateChunks),
            "入库后总 chunk 数：" + formatNullable(item.total_chunks_after_add),
            "是否删除：" + formatYesNo(item.is_deleted),
            "删除时间：" + formatNullable(item.deleted_at),
            "时间：" + formatNullable(item.created_at),
        ];
        content.innerText = lines.join("\n");

        div.appendChild(heading);
        div.appendChild(content);
        documentRecordBox.appendChild(div);
    }
}

async function loadDocumentRecords() {
    try {
        documentRecordBox.innerText = "正在加载文档入库记录...";

        const response = await fetch("/rag/documents?limit=10");
        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            documentRecordBox.innerText = data.detail || `获取文档入库记录失败，状态码：${response.status}`;
            return;
        }

        renderDocumentRecords(data.documents);
    } catch (error) {
        console.log("获取文档入库记录失败：", error);
        documentRecordBox.innerText = "网络错误，获取文档入库记录失败";
    }
}

async function deleteDocumentRecord(documentId) {
    if (documentId === undefined || documentId === null) {
        result.innerText = "缺少文档记录ID";
        return;
    }

    const confirmed = window.confirm("确认删除这条文档入库记录，并同步删除对应知识库片段吗？");

    if (!confirmed) {
        return;
    }

    try {
        result.innerText = "正在删除文档记录...";

        const response = await fetch("/rag/documents/" + encodeURIComponent(documentId), {
            method: "DELETE"
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            result.innerText = data.detail || `删除文档记录失败，状态码：${response.status}`;
            return;
        }

        result.innerText =
            (data.message || "文档记录已删除") +
            "，删除 chunk 数：" + formatNullable(data.deleted_chunk_count);

        await loadDocumentRecords();
    } catch (error) {
        console.log("删除文档记录失败：", error);
        result.innerText = "网络错误，删除文档记录失败";
    }
}

function formatQaReferenceSummary(referencesJson) {
    if (!referencesJson) {
        return "";
    }

    try {
        const references = JSON.parse(referencesJson);
        if (!Array.isArray(references) || references.length === 0) {
            return "";
        }

        return references.slice(0, 3).map(function (item, index) {
            return "参考 " + (index + 1) +
                "：" + formatNullable(item.source_name) +
                "，chunk_id：" + formatNullable(item.chunk_id) +
                "，相似度：" + formatScore(item.score);
        }).join("\n");
    } catch {
        return "";
    }
}

function renderQaRecords(records) {
    qaRecordBox.innerHTML = "";

    if (!records || records.length === 0) {
        qaRecordBox.innerText = "暂无问答历史";
        return;
    }

    for (let i = 0; i < records.length; i++) {
        const item = records[i];
        const div = document.createElement("div");
        div.classList.add("reference-item");

        const title = document.createElement("div");
        title.classList.add("reference-title");
        title.innerText =
            "记录 #" + formatNullable(item.id) +
            "，" + (item.is_answerable === false ? "相关度不足" : "已回答") +
            "，最高相似度：" + formatScore(item.max_score);

        const content = document.createElement("div");
        const lines = [
            "问题：" + formatNullable(item.question),
            "回答：" + formatNullable(item.answer),
            "阈值：" + formatScore(item.score_threshold),
            "top_k：" + formatNullable(item.top_k),
            "参考片段数：" + formatNullable(item.reference_count),
            "时间：" + formatNullable(item.created_at),
        ];
        const referenceSummary = formatQaReferenceSummary(item.references_json);
        if (referenceSummary) {
            lines.push(referenceSummary);
        }
        content.innerText = lines.join("\n");

        div.appendChild(title);
        div.appendChild(content);
        qaRecordBox.appendChild(div);
    }
}

async function loadQaRecords() {
    try {
        qaRecordBox.innerText = "正在加载问答历史...";

        const response = await fetch("/rag/qa-records?limit=20");
        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            qaRecordBox.innerText = data.detail || `获取问答历史失败，状态码：${response.status}`;
            return;
        }

        renderQaRecords(data.qa_records);
    } catch (error) {
        console.log("获取问答历史失败：", error);
        qaRecordBox.innerText = "网络错误，获取问答历史失败";
    }
}


refreshRagFilesBtn.addEventListener("click", loadRagFiles);
refreshDocumentRecordsBtn.addEventListener("click", loadDocumentRecords);
refreshQaRecordsBtn.addEventListener("click", loadQaRecords);
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
if (window.location.protocol === "file:") {
    result.innerText = "本地文件预览模式";
} else {
    loadFiles();
    loadRagFiles();
    loadDocumentRecords();
    loadQaRecords();
}
