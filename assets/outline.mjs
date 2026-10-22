const {
    PDFDocument,
    PDFName,
    PDFString,
    PDFHexString,
    PDFNumber,
    PDFNull,
    PDFArray,
    PDFDict,
    PDFRef,
} = PDFLib;

// DOM
const dropArea        = document.getElementById('drop-area');
const fileInput       = document.getElementById('file-input');
const selectFileBtn   = document.getElementById('select-file-btn');
const fileInfo        = document.getElementById('file-info');
const outlineSection  = document.getElementById('outline-section');
const actionSection   = document.getElementById('action-section');
const outlineBefore   = document.getElementById('outline-before');
const outlineAfter    = document.getElementById('outline-after');
const statTotalItems  = document.getElementById('stat-total-items');
const statSectionCount = document.getElementById('stat-section-count');
const statPageCount   = document.getElementById('stat-page-count');
const sortBtn         = document.getElementById('sort-btn');
const sortBtnLabel    = document.getElementById('sort-btn-label');
const errorBox        = document.getElementById('error-box');
const errorMessage    = document.getElementById('error-message');

let pdfBytes      = null;
let loadedItems   = null;
let loadedPreview = null;
let selectedFile  = null;
let selectionGeneration = 0;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
});

selectFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
    fileInput.value = '';
});
sortBtn.addEventListener('click', sortAndDownload);
setupDropZone(dropArea, (dt) => { if (dt.files[0]) handleFile(dt.files[0]); });

// ----------------------------------------------------------------
// ファイル読み込み
// ----------------------------------------------------------------
async function handleFile(file) {
    if (isProcessing()) return;
    const generation = ++selectionGeneration;
    pdfBytes = loadedItems = loadedPreview = selectedFile = null;
    outlineBefore.replaceChildren();
    outlineAfter.replaceChildren();
    outlineSection.classList.add('hidden');
    actionSection.classList.add('hidden');
    fileInfo.textContent = '';
    if (!acceptFiles([file], showError)) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        showError('PDFファイルを選択してください。');
        return;
    }

    hideError();
    outlineSection.classList.add('hidden');
    actionSection.classList.add('hidden');
    fileInfo.textContent = `${file.name}  (${formatBytes(file.size)})`;
    selectedFile = file;

    try {
        const bytes = await file.arrayBuffer();
        const pdfDoc = await loadPdfSafely(bytes, {});
        if (generation !== selectionGeneration || isProcessing()) return;
        pdfBytes = bytes;
        const items = readOutline(pdfDoc);

        if (!items || items.length === 0) {
            showError('このPDFにはアウトライン（しおり）が含まれていません。');
            return;
        }

        loadedPreview = buildOutlinePreview(pdfDoc, items);
        loadedItems = loadedPreview.items;

        renderComparison(loadedItems);
        outlineSection.classList.remove('hidden');
        actionSection.classList.remove('hidden');
    } catch (err) {
        if (generation !== selectionGeneration || isProcessing()) return;
        showError(`PDFの読み込みに失敗しました: ${err.message}`);
        console.error(err);
    }
}

// ----------------------------------------------------------------
// アウトライン読み取り
//   戻り値: Item[]
//   Item = { title, titleObj, dest, action, count, color, flags, children: Item[] }
// ----------------------------------------------------------------
function readOutline(pdfDoc) {
    const outlinesRef = pdfDoc.catalog.get(PDFName.of('Outlines'));
    if (!outlinesRef) return null;

    const outlinesDict = pdfDoc.context.lookup(outlinesRef);
    if (!outlinesDict) return null;

    const visited = new Set();
    function readLevel(parentDict, depth = 0) {
        if (depth > 32) throw new Error('Outline nesting limit exceeded / しおりの階層が深すぎます');
        const items = [];
        let currentRef = parentDict.get(PDFName.of('First'));

        while (currentRef) {
            const key = currentRef.toString();
            if (visited.has(key) || visited.size >= 5000) throw new Error('Invalid or oversized outline / しおり構造が不正または上限超過です');
            visited.add(key);
            let dict;
            try { dict = pdfDoc.context.lookup(currentRef); } catch { break; }
            if (!dict) break;

            const titleObj = dict.get(PDFName.of('Title'));
            let title = '';
            if (titleObj && typeof titleObj.decodeText === 'function') {
                try { title = titleObj.decodeText(); } catch { title = ''; }
            }

            const countObj = dict.get(PDFName.of('Count'));
            const count = (countObj && typeof countObj.asNumber === 'function')
                ? countObj.asNumber()
                : null;

            items.push({
                title,
                titleObj,
                dest: dict.get(PDFName.of('Dest')),
                action: dict.get(PDFName.of('A')),
                count,
                color: dict.get(PDFName.of('C')),
                flags: dict.get(PDFName.of('F')),
                children: readLevel(dict, depth + 1),
                startPageIndex: null,
                sectionStart: null,
                sectionEnd: null,
                pageRangeLabel: null,
                reorderedPageRangeLabel: null,
                resolvedDest: null,
            });

            currentRef = dict.get(PDFName.of('Next'));
        }

        return items;
    }

    return readLevel(outlinesDict);
}

// ----------------------------------------------------------------
// プレビュー用の解析
// ----------------------------------------------------------------
function buildOutlinePreview(pdfDoc, items) {
    const pages = pdfDoc.getPages();
    const pageRefToIndex = new Map();
    const pageNodeToIndex = new Map();

    pages.forEach((page, index) => {
        if (page.ref) pageRefToIndex.set(refKey(page.ref), index);
        if (page.node) pageNodeToIndex.set(page.node, index);
    });

    annotateResolvedDestinations(items, pdfDoc, pageRefToIndex, pageNodeToIndex);
    assignSectionRanges(items, 0, pages.length);

    const pageOrder = finalizePageOrder(buildPageOrder(items, pages.length), pages.length);
    const oldToNewPageIndex = new Map(pageOrder.map((oldIndex, newIndex) => [oldIndex, newIndex]));
    annotateRangeLabels(items, oldToNewPageIndex);

    return { items, pageOrder, pageCount: pages.length };
}

function annotateResolvedDestinations(items, pdfDoc, pageRefToIndex, pageNodeToIndex) {
    items.forEach(item => {
        annotateResolvedDestinations(item.children, pdfDoc, pageRefToIndex, pageNodeToIndex);

        item.resolvedDest = resolveOutlineDestination(item, pdfDoc, pageRefToIndex, pageNodeToIndex);

        const ownStart = item.resolvedDest?.pageIndex;
        const childStarts = item.children
            .map(child => child.startPageIndex)
            .filter(Number.isInteger);

        item.startPageIndex = Number.isInteger(ownStart)
            ? ownStart
            : (childStarts.length > 0 ? Math.min(...childStarts) : null);
    });
}

function resolveOutlineDestination(item, pdfDoc, pageRefToIndex, pageNodeToIndex) {
    const directDest = resolveDestinationObject(item.dest, pdfDoc, pageRefToIndex, pageNodeToIndex);
    if (directDest) return directDest;

    const actionDict = lookupAs(pdfDoc, item.action, PDFDict);
    if (!actionDict) return null;

    const actionType = pdfNameToString(dictLookupAs(pdfDoc, actionDict, 'S', PDFName));
    if (actionType !== 'GoTo') return null;

    return resolveDestinationObject(
        actionDict.get(PDFName.of('D')),
        pdfDoc,
        pageRefToIndex,
        pageNodeToIndex
    );
}

function resolveDestinationObject(destObj, pdfDoc, pageRefToIndex, pageNodeToIndex) {
    if (!destObj) return null;

    const resolvedObj = resolveDestinationReference(destObj, pdfDoc);
    const destArray = lookupAs(pdfDoc, resolvedObj, PDFArray);
    if (!destArray) return null;

    return parseExplicitDestination(destArray, pdfDoc, pageRefToIndex, pageNodeToIndex);
}

function resolveDestinationReference(destObj, pdfDoc) {
    const directArray = lookupAs(pdfDoc, destObj, PDFArray);
    if (directArray) return directArray;

    const resolvedText = getPdfTextOrName(lookupObject(pdfDoc, destObj));
    if (!resolvedText) return null;

    return lookupNamedDestination(pdfDoc, resolvedText);
}

function lookupNamedDestination(pdfDoc, nameText) {
    const directDests = dictLookupAs(pdfDoc, pdfDoc.catalog, 'Dests', PDFDict);
    if (directDests) {
        for (const [key, value] of directDests.entries()) {
            if (getPdfTextOrName(key) === nameText) {
                const resolved = extractNamedDestinationValue(pdfDoc, value);
                if (resolved) return resolved;
            }
        }
    }

    const namesDict = dictLookupAs(pdfDoc, pdfDoc.catalog, 'Names', PDFDict);
    const destsTree = namesDict ? dictLookupAs(pdfDoc, namesDict, 'Dests', PDFDict) : null;
    return destsTree ? findNamedDestinationInTree(pdfDoc, destsTree, nameText) : null;
}

function findNamedDestinationInTree(pdfDoc, treeDict, nameText) {
    const namesArray = dictLookupAs(pdfDoc, treeDict, 'Names', PDFArray);
    if (namesArray) {
        for (let i = 0, len = namesArray.size(); i < len; i += 2) {
            const keyObj = lookupObject(pdfDoc, namesArray.get(i));
            if (getPdfTextOrName(keyObj) === nameText) {
                return extractNamedDestinationValue(pdfDoc, namesArray.get(i + 1));
            }
        }
    }

    const kids = dictLookupAs(pdfDoc, treeDict, 'Kids', PDFArray);
    if (!kids) return null;

    for (let i = 0, len = kids.size(); i < len; i++) {
        const kid = arrayLookupAs(pdfDoc, kids, i, PDFDict);
        if (!kid) continue;

        const found = findNamedDestinationInTree(pdfDoc, kid, nameText);
        if (found) return found;
    }

    return null;
}

function extractNamedDestinationValue(pdfDoc, valueObj) {
    const directArray = lookupAs(pdfDoc, valueObj, PDFArray);
    if (directArray) return directArray;

    const destDict = lookupAs(pdfDoc, valueObj, PDFDict);
    if (!destDict) return null;

    return lookupAs(pdfDoc, destDict.get(PDFName.of('D')), PDFArray);
}

function parseExplicitDestination(destArray, pdfDoc, pageRefToIndex, pageNodeToIndex) {
    const pageIndex = resolveDestinationPageIndex(destArray, pdfDoc, pageRefToIndex, pageNodeToIndex);
    if (!Number.isInteger(pageIndex)) return null;

    const mode = pdfNameToString(arrayLookupAs(pdfDoc, destArray, 1, PDFName)) || 'Fit';
    const params = [];
    for (let i = 2, len = destArray.size(); i < len; i++) {
        params.push(parseDestinationParam(lookupObject(pdfDoc, destArray.get(i))));
    }

    return { pageIndex, mode, params };
}

function resolveDestinationPageIndex(destArray, pdfDoc, pageRefToIndex, pageNodeToIndex) {
    const pageRef = arrayLookupAs(pdfDoc, destArray, 0, PDFRef);
    if (pageRef && pageRefToIndex.has(refKey(pageRef))) {
        return pageRefToIndex.get(refKey(pageRef));
    }

    const pageDict = arrayLookupAs(pdfDoc, destArray, 0, PDFDict);
    if (pageDict && pageNodeToIndex.has(pageDict)) {
        return pageNodeToIndex.get(pageDict);
    }

    const rawPageObj = lookupObject(pdfDoc, destArray.get(0));
    if (rawPageObj instanceof PDFRef && pageRefToIndex.has(refKey(rawPageObj))) {
        return pageRefToIndex.get(refKey(rawPageObj));
    }

    return pageNodeToIndex.get(rawPageObj) ?? null;
}

function assignSectionRanges(items, containerStart, containerEnd) {
    items.forEach(item => {
        item.sectionStart = null;
        item.sectionEnd = null;
    });

    const docOrdered = items
        .map((item, index) => ({ item, index, start: item.startPageIndex }))
        .filter(({ start }) => Number.isInteger(start) && start >= containerStart && start < containerEnd)
        .sort((a, b) => a.start - b.start || a.index - b.index);

    const groups = [];
    docOrdered.forEach(entry => {
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.start === entry.start) {
            lastGroup.entries.push(entry);
        } else {
            groups.push({ start: entry.start, entries: [entry] });
        }
    });

    groups.forEach((group, groupIndex) => {
        const groupEnd = groupIndex < groups.length - 1
            ? groups[groupIndex + 1].start
            : containerEnd;

        group.entries.forEach((entry, entryIndex) => {
            entry.item.sectionStart = group.start;
            entry.item.sectionEnd = entryIndex === 0 ? groupEnd : group.start;
        });
    });

    items.forEach(item => {
        if (item.children.length === 0) return;
        if (!Number.isInteger(item.sectionStart) || !Number.isInteger(item.sectionEnd)) return;
        assignSectionRanges(item.children, item.sectionStart, item.sectionEnd);
    });
}

function buildPageOrder(items, pageCount) {
    const firstSectionStart = items
        .map(item => item.sectionStart)
        .filter(Number.isInteger)
        .reduce((min, start) => Math.min(min, start), pageCount);

    const order = range(firstSectionStart > 0 ? 0 : 0, firstSectionStart);
    naturalSort(items).forEach(item => {
        order.push(...buildPageOrderForItem(item));
    });

    return order;
}

function buildPageOrderForItem(item) {
    if (!Number.isInteger(item.sectionStart) || !Number.isInteger(item.sectionEnd)) return [];
    if (item.sectionEnd <= item.sectionStart) return [];

    const childSections = item.children.filter(child =>
        Number.isInteger(child.sectionStart) &&
        Number.isInteger(child.sectionEnd) &&
        child.sectionStart >= item.sectionStart &&
        child.sectionStart < item.sectionEnd &&
        child.sectionEnd > child.sectionStart
    );

    if (childSections.length === 0) {
        return range(item.sectionStart, item.sectionEnd);
    }

    const firstChildStart = Math.min(...childSections.map(child => child.sectionStart));
    const order = range(item.sectionStart, firstChildStart);

    naturalSort(item.children).forEach(child => {
        order.push(...buildPageOrderForItem(child));
    });

    return order;
}

function finalizePageOrder(pageOrder, pageCount) {
    const seen = new Set();
    const normalized = [];

    pageOrder.forEach(pageIndex => {
        if (!Number.isInteger(pageIndex)) return;
        if (pageIndex < 0 || pageIndex >= pageCount) return;
        if (seen.has(pageIndex)) return;
        seen.add(pageIndex);
        normalized.push(pageIndex);
    });

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        if (seen.has(pageIndex)) continue;
        normalized.push(pageIndex);
    }

    return normalized;
}

function annotateRangeLabels(items, oldToNewPageIndex) {
    items.forEach(item => {
        item.pageRangeLabel = formatPageRange(item.sectionStart, item.sectionEnd);
        item.reorderedPageRangeLabel = formatRemappedRange(item.sectionStart, item.sectionEnd, oldToNewPageIndex);
        annotateRangeLabels(item.children, oldToNewPageIndex);
    });
}

// ----------------------------------------------------------------
// 自然順ソート（1, 2, 3 ... 10, 11 の順）
// ----------------------------------------------------------------
function naturalSort(items) {
    return [...items].sort((a, b) =>
        a.title.localeCompare(b.title, 'ja', { numeric: true, sensitivity: 'base' })
    );
}

function sortDeep(items) {
    return naturalSort(items).map(item => ({
        ...item,
        children: sortDeep(item.children),
    }));
}

// ----------------------------------------------------------------
// 比較プレビュー表示
// ----------------------------------------------------------------
function renderComparison(items) {
    outlineBefore.innerHTML = '';
    outlineAfter.innerHTML  = '';

    const sorted = sortDeep(items);
    renderList(outlineBefore, items, 0, 'pageRangeLabel');
    renderList(outlineAfter, sorted, 0, 'reorderedPageRangeLabel');

    const total = countAll(items);
    const sections = countSections(items);
    const pageCount = loadedPreview?.pageCount;
    statTotalItems.textContent = String(total);
    statSectionCount.textContent = String(sections);
    statPageCount.textContent = Number.isInteger(pageCount) ? String(pageCount) : '-';
}

function renderList(container, items, depth, rangeKey) {
    const MAX_DEPTH = 2;

    items.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-2 py-2 pr-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors';
        li.style.paddingLeft = `${12 + depth * 20}px`;

        const rangeLabel = item[rangeKey];
        const countBadge = item.children.length > 0
            ? `<span class="flex-shrink-0 text-xs text-slate-400 mt-0.5">▾${item.children.length}</span>`
            : '';
        const rangeBadge = rangeLabel
            ? `<span class="flex-shrink-0 mt-0.5 text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">${escapeHtml(rangeLabel)}</span>`
            : '';

        li.innerHTML = `
            <span class="flex-shrink-0 w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">${idx + 1}</span>
            <span class="text-slate-700 dark:text-slate-200 truncate flex-1">${escapeHtml(item.title) || '<em class="text-slate-400">タイトルなし</em>'}</span>
            ${rangeBadge}
            ${countBadge}
        `;
        container.appendChild(li);

        if (item.children.length > 0 && depth < MAX_DEPTH) {
            renderList(container, item.children, depth + 1, rangeKey);
        }
    });
}

function countAll(items) {
    return items.reduce((n, item) => n + 1 + countAll(item.children), 0);
}

function countSections(items) {
    return items.reduce((n, item) => {
        const hasSectionRange = Number.isInteger(item.sectionStart)
            && Number.isInteger(item.sectionEnd)
            && item.sectionEnd > item.sectionStart;
        return n + (hasSectionRange ? 1 : 0) + countSections(item.children);
    }, 0);
}

// ----------------------------------------------------------------
// ソート実行 → PDF再構築 → ダウンロード
// ----------------------------------------------------------------
async function sortAndDownload() {
    return withProcessingLock(() => sortAndDownloadTask());
}

async function sortAndDownloadTask() {
    if (!pdfBytes || !loadedItems) return;

    sortBtn.disabled = true;
    sortBtnLabel.textContent = '処理中...';
    hideError();

    try {
        const sourceDoc = await loadPdfSafely(pdfBytes, {});
        const sourceItems = readOutline(sourceDoc);
        if (!sourceItems || sourceItems.length === 0) {
            showError('アウトラインが見つかりません。');
            return;
        }

        const preview = buildOutlinePreview(sourceDoc, sourceItems);
        const pageOrder = preview.pageOrder;
        const oldToNewPageIndex = new Map(pageOrder.map((oldIndex, newIndex) => [oldIndex, newIndex]));

        const resultDoc = await PDFDocument.create();
        copyDocumentMetadata(sourceDoc, resultDoc);

        const copiedPages = await resultDoc.copyPages(sourceDoc, pageOrder);
        copiedPages.forEach(page => resultDoc.addPage(page));

        const resultPages = resultDoc.getPages();
        const outlineResult = buildSortedOutline(resultDoc, sourceDoc, preview.items, resultPages, oldToNewPageIndex);

        if (outlineResult) {
            const outlinesDict = resultDoc.context.obj({
                Type: 'Outlines',
                First: outlineResult.firstRef,
                Last: outlineResult.lastRef,
                Count: PDFNumber.of(outlineResult.builtItems.length),
            });
            const outlinesRef = resultDoc.context.register(outlinesDict);

            outlineResult.builtItems.forEach(item => {
                item.dict.set(PDFName.of('Parent'), outlinesRef);
            });

            resultDoc.catalog.set(PDFName.of('Outlines'), outlinesRef);
        }

        const newBytes = await resultDoc.save();
        checkOutputBytes(newBytes.length);
        const blob = new Blob([newBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedFile
            ? selectedFile.name.replace(/\.pdf$/i, '_sorted.pdf')
            : 'outline_sorted.pdf';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
        showError(`処理に失敗しました: ${err.message}`);
        console.error(err);
    } finally {
        sortBtn.disabled = false;
        sortBtnLabel.textContent = 'アウトラインとページを並び替えてダウンロード';
    }
}

function buildSortedOutline(resultDoc, sourceDoc, items, resultPages, oldToNewPageIndex) {
    const ctx = resultDoc.context;

    function buildLevel(levelItems) {
        if (levelItems.length === 0) return null;

        const builtItems = naturalSort(levelItems).map(item => {
            const childResult = buildLevel(item.children);
            const dictDef = {};
            const titleObject = lookupObject(sourceDoc, item.titleObj);
            const colorObject = lookupObject(sourceDoc, item.color);
            const flagsObject = lookupObject(sourceDoc, item.flags);

            if (titleObject && typeof titleObject.clone === 'function') {
                dictDef.Title = titleObject.clone(ctx);
            } else {
                dictDef.Title = PDFHexString.fromText(item.title);
            }

            const dest = buildDestinationForItem(item, resultPages, oldToNewPageIndex, ctx);
            if (dest) {
                dictDef.Dest = dest;
            } else {
                const externalAction = cloneExternalActionIfPossible(sourceDoc, item.action, ctx);
                if (externalAction) dictDef.A = externalAction;
            }

            if (colorObject && typeof colorObject.clone === 'function') {
                dictDef.C = colorObject.clone(ctx);
            }
            if (flagsObject && typeof flagsObject.clone === 'function') {
                dictDef.F = flagsObject.clone(ctx);
            }

            if (childResult) {
                dictDef.First = childResult.firstRef;
                dictDef.Last = childResult.lastRef;
                const childCount = childResult.builtItems.length;
                dictDef.Count = PDFNumber.of(
                    item.count !== null && item.count < 0 ? -childCount : childCount
                );
            }

            const dict = ctx.obj(dictDef);
            const ref = ctx.register(dict);

            if (childResult) {
                childResult.builtItems.forEach(child => {
                    child.dict.set(PDFName.of('Parent'), ref);
                });
            }

            return { dict, ref };
        });

        for (let i = 0; i < builtItems.length; i++) {
            if (i > 0) {
                builtItems[i].dict.set(PDFName.of('Prev'), builtItems[i - 1].ref);
            }
            if (i < builtItems.length - 1) {
                builtItems[i].dict.set(PDFName.of('Next'), builtItems[i + 1].ref);
            }
        }

        return {
            firstRef: builtItems[0].ref,
            lastRef: builtItems[builtItems.length - 1].ref,
            builtItems,
        };
    }

    return buildLevel(items);
}

function buildDestinationForItem(item, resultPages, oldToNewPageIndex, ctx) {
    const resolvedDest = item.resolvedDest;
    if (!resolvedDest || !Number.isInteger(resolvedDest.pageIndex)) return null;

    const newPageIndex = oldToNewPageIndex.get(resolvedDest.pageIndex);
    if (!Number.isInteger(newPageIndex)) return null;

    const page = resultPages[newPageIndex];
    if (!page?.ref) return null;

    return createDestinationArray(ctx, page.ref, resolvedDest);
}

function createDestinationArray(ctx, pageRef, resolvedDest) {
    const mode = resolvedDest.mode || 'Fit';
    const params = resolvedDest.params || [];

    switch (mode) {
        case 'XYZ':
            return ctx.obj([
                pageRef,
                PDFName.of('XYZ'),
                toOptionalPdfValue(params[0]),
                toOptionalPdfValue(params[1]),
                toOptionalPdfValue(params[2]),
            ]);
        case 'FitH':
        case 'FitBH':
            return ctx.obj([
                pageRef,
                PDFName.of(mode),
                toOptionalPdfValue(params[0]),
            ]);
        case 'FitV':
        case 'FitBV':
            return ctx.obj([
                pageRef,
                PDFName.of(mode),
                toOptionalPdfValue(params[0]),
            ]);
        case 'FitR':
            return ctx.obj([
                pageRef,
                PDFName.of('FitR'),
                toRequiredPdfNumber(params[0]),
                toRequiredPdfNumber(params[1]),
                toRequiredPdfNumber(params[2]),
                toRequiredPdfNumber(params[3]),
            ]);
        case 'Fit':
        case 'FitB':
            return ctx.obj([pageRef, PDFName.of(mode)]);
        default:
            return ctx.obj([pageRef, PDFName.of('Fit')]);
    }
}

function cloneExternalActionIfPossible(sourceDoc, actionObj, ctx) {
    const actionDict = lookupAs(sourceDoc, actionObj, PDFDict);
    if (!actionDict) return null;

    const actionType = pdfNameToString(dictLookupAs(sourceDoc, actionDict, 'S', PDFName));
    if (actionType === 'GoTo') return null;

    try {
        return actionDict.clone(ctx);
    } catch {
        return null;
    }
}

function copyDocumentMetadata(sourceDoc, targetDoc) {
    const copyIfPresent = (getterName, setterName) => {
        if (typeof sourceDoc[getterName] !== 'function') return;
        if (typeof targetDoc[setterName] !== 'function') return;

        const value = sourceDoc[getterName]();
        if (value === undefined || value === null || value === '') return;
        targetDoc[setterName](value);
    };

    copyIfPresent('getTitle', 'setTitle');
    copyIfPresent('getAuthor', 'setAuthor');
    copyIfPresent('getSubject', 'setSubject');
    copyIfPresent('getCreator', 'setCreator');
    copyIfPresent('getProducer', 'setProducer');

    if (typeof sourceDoc.getKeywords === 'function' && typeof targetDoc.setKeywords === 'function') {
        const keywords = sourceDoc.getKeywords();
        if (Array.isArray(keywords) && keywords.length > 0) {
            targetDoc.setKeywords(keywords);
        }
    }

    if (typeof sourceDoc.getCreationDate === 'function' && typeof targetDoc.setCreationDate === 'function') {
        const createdAt = sourceDoc.getCreationDate();
        if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime())) {
            targetDoc.setCreationDate(createdAt);
        }
    }

    if (typeof sourceDoc.getModificationDate === 'function' && typeof targetDoc.setModificationDate === 'function') {
        const modifiedAt = sourceDoc.getModificationDate();
        if (modifiedAt instanceof Date && !Number.isNaN(modifiedAt.getTime())) {
            targetDoc.setModificationDate(modifiedAt);
        }
    }
}

// ----------------------------------------------------------------
// ユーティリティ
// ----------------------------------------------------------------
function lookupAs(pdfDoc, obj, ...types) {
    if (!obj) return null;
    try {
        return pdfDoc.context.lookupMaybe(obj, ...types) ?? null;
    } catch {
        return types.some(type => obj instanceof type) ? obj : null;
    }
}

function dictLookupAs(pdfDoc, dict, key, ...types) {
    if (!dict || typeof dict.get !== 'function') return null;
    return lookupAs(pdfDoc, dict.get(PDFName.of(key)), ...types);
}

function arrayLookupAs(pdfDoc, array, index, ...types) {
    if (!array || typeof array.get !== 'function') return null;
    return lookupAs(pdfDoc, array.get(index), ...types);
}

function lookupObject(pdfDoc, obj) {
    if (!obj) return null;
    try {
        return pdfDoc.context.lookup(obj);
    } catch {
        return obj;
    }
}

function getPdfTextOrName(obj) {
    if (!obj) return null;
    if (obj instanceof PDFString || obj instanceof PDFHexString) {
        try { return obj.decodeText(); } catch { return null; }
    }
    if (obj instanceof PDFName) {
        return pdfNameToString(obj);
    }
    if (typeof obj.decodeText === 'function') {
        try { return obj.decodeText(); } catch { return null; }
    }
    return null;
}

function pdfNameToString(obj) {
    if (!obj) return null;
    const text = typeof obj.toString === 'function' ? obj.toString() : String(obj);
    return text.startsWith('/') ? text.slice(1) : text;
}

function parseDestinationParam(obj) {
    if (!obj || obj === PDFNull) return null;
    if (typeof obj.toString === 'function' && obj.toString() === 'null') return null;
    if (obj instanceof PDFNumber) return obj.asNumber();
    return typeof obj.asNumber === 'function' ? obj.asNumber() : null;
}

function toOptionalPdfValue(value) {
    return typeof value === 'number' ? PDFNumber.of(value) : PDFNull;
}

function toRequiredPdfNumber(value) {
    return PDFNumber.of(typeof value === 'number' ? value : 0);
}

function formatPageRange(start, end) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return null;
    if (end === start + 1) return `p${start + 1}`;
    return `p${start + 1}-${end}`;
}

function formatRemappedRange(start, end, oldToNewPageIndex) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) return null;

    const mapped = [];
    for (let oldPage = start; oldPage < end; oldPage++) {
        const newPage = oldToNewPageIndex.get(oldPage);
        if (Number.isInteger(newPage)) mapped.push(newPage);
    }

    if (mapped.length === 0) return null;
    return formatPageRange(Math.min(...mapped), Math.max(...mapped) + 1);
}

function range(start, end) {
    const pages = [];
    for (let i = start; i < end; i++) pages.push(i);
    return pages;
}

function refKey(ref) {
    return typeof ref.toString === 'function' ? ref.toString() : String(ref);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.classList.remove('hidden');
}

function hideError() {
    errorBox.classList.add('hidden');
}
