"use client";

import { useCallback, useMemo, useRef } from "react";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { ja } from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface RichEditorProps {
    initialContent?: PartialBlock[];
    onChange?: (content: PartialBlock[]) => void;
    editable?: boolean;
    onUploadFile?: (file: File) => Promise<string>;
}

export function RichEditor({
    initialContent,
    onChange,
    editable = true,
    onUploadFile,
}: RichEditorProps) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const onUploadFileRef = useRef(onUploadFile);
    onUploadFileRef.current = onUploadFile;

    const uploadFile = useMemo(() => {
        return async (file: File) => {
            if (onUploadFileRef.current) {
                return onUploadFileRef.current(file);
            }
            // Fallback: convert to data URL if no upload function provided
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        };
    }, []);

    const editor = useCreateBlockNote({
        initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
        dictionary: ja,
        uploadFile,
    });

    const handleChange = useCallback(() => {
        if (onChangeRef.current && editor) {
            try {
                onChangeRef.current(editor.document);
            } catch (e) {
                // Editor not ready yet
            }
        }
    }, [editor]);

    return (
        <div className="rich-editor-wrapper">
            <BlockNoteView
                editor={editor}
                editable={editable}
                onChange={handleChange}
                theme="light"
            />
            <style jsx global>{`
                .rich-editor-wrapper {
                    min-height: 300px;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.75rem;
                    overflow: hidden;
                }
                .rich-editor-wrapper .bn-container {
                    min-height: 300px;
                }
                .rich-editor-wrapper .bn-editor {
                    color: #111827;
                    padding-right: 0;
                }
                .rich-editor-wrapper .bn-block-outer {
                    margin-right: 0;
                }
                /* 画像の最大幅を制限 */
                .rich-editor-wrapper .bn-image-block img {
                    max-width: 100%;
                    height: auto;
                }
                /* スラッシュメニューのサイズをモバイル向けに調整 */
                .bn-suggestion-menu {
                    width: 280px;
                    max-height: 45vh;
                    overflow-y: auto;
                    margin-left: -50px;
                }
                .bn-suggestion-menu .bn-suggestion-menu-item {
                    padding: 8px 12px;
                }
                /* スラッシュメニューの説明とショートカットを非表示 */
                .bn-mt-suggestion-menu-item-subtitle,
                .bn-mt-suggestion-menu-item-section[data-position="right"] {
                    display: none;
                }
                /* フォーマットツールバーのサイズ調整 */
                .bn-formatting-toolbar {
                    flex-wrap: wrap;
                    gap: 2px;
                }
                /* ダークモード */
                .dark .rich-editor-wrapper {
                    border-color: #374151;
                }
                .dark .rich-editor-wrapper .bn-container {
                    background: #111827;
                }
                .dark .rich-editor-wrapper .bn-editor {
                    color: #f3f4f6;
                }
            `}</style>
        </div>
    );
}

// Read-only viewer component
export function RichViewer({ content }: { content: PartialBlock[] }) {
    const editor = useCreateBlockNote({
        initialContent: content && content.length > 0 ? content : undefined,
        dictionary: ja,
    });

    return (
        <div className="rich-viewer-wrapper">
            <BlockNoteView
                editor={editor}
                editable={false}
                theme="light"
            />
            <style jsx global>{`
                .rich-viewer-wrapper .bn-editor {
                    padding: 0;
                }
            `}</style>
        </div>
    );
}
