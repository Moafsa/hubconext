"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, X, FileText, ImageIcon, Video, File as FileIcon, CheckCircle2, Loader2 } from "lucide-react";
import { getPresignedUrl } from "@/app/actions/upload-actions";
import { saveFileReference } from "@/app/actions/db-actions";

interface UploadedFile {
  name: string;
  key: string;
  type: string;
  size: number;
  previewUrl?: string;
}

interface WizardFileUploadProps {
  projectPath: string; // ex: "temp/{agencyId}/{timestamp}" antes de criar o projeto
  onFilesChange?: (files: UploadedFile[]) => void;
  projectId?: string;  // se já tiver projeto criado, salvar referência no DB
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
  if (type.startsWith("video/")) return <Video className="w-4 h-4" />;
  if (type === "application/pdf") return <FileText className="w-4 h-4" />;
  return <FileIcon className="w-4 h-4" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function WizardFileUpload({ projectPath, onFilesChange, projectId }: WizardFileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const { presignedUrl, secureKey } = await getPresignedUrl(file.name, file.type, projectPath);

        const uploadRes = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) throw new Error("Falha no upload");

        const uploadedFile: UploadedFile = {
          name: file.name,
          key: secureKey,
          type: file.type,
          size: file.size,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        };

        // Se já tiver projectId, salvar referência no banco
        if (projectId) {
          await saveFileReference(projectId, file.name, secureKey, file.type, file.size);
        }

        newFiles.push(uploadedFile);
      } catch (err) {
        console.error("Erro ao enviar arquivo:", file.name, err);
        alert(`Erro ao enviar: ${file.name}`);
      }
    }

    const updated = [...files, ...newFiles];
    setFiles(updated);
    onFilesChange?.(updated);
    setUploading(false);
  }, [files, projectPath, projectId, onFilesChange]);

  const removeFile = (key: string) => {
    const updated = files.filter(f => f.key !== key);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer
          transition-all duration-300 group
          ${isDragOver
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
          }
          ${uploading ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm font-bold text-slate-600">Enviando para o cofre seguro...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${isDragOver ? "bg-blue-100" : "bg-slate-100"}`}>
              <UploadCloud className={`w-7 h-7 ${isDragOver ? "text-blue-500" : "text-slate-400"}`} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-700">
                {isDragOver ? "Solte os arquivos aqui" : "Arraste ou clique para anexar"}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Fotos · Vídeos · PDFs · Docs · ZIPs
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.key}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 group"
            >
              {/* Preview miniatura */}
              {file.previewUrl ? (
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  className="w-10 h-10 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                  {getFileIcon(file.type)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{formatSize(file.size)}</p>
              </div>

              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />

              <button
                onClick={(e) => { e.stopPropagation(); removeFile(file.key); }}
                className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
