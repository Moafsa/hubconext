"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle, File as FileIcon, X, Loader2 } from 'lucide-react';
import { getPresignedUrl } from '@/app/actions/upload-actions';
import { saveFileReference } from "@/app/actions/db-actions";

interface ProjectDropzoneProps {
  projectPath: string;
  themeColor?: string;
  agencyName?: string;
  projectId?: string;
  /** Chamado após cada arquivo persistido com sucesso (para atualizar lista no modal). */
  onUploadComplete?: () => void;
}

export function ProjectDropzone({ projectPath, themeColor = "#3b82f6", agencyName = "Agência Parceira", projectId, onUploadComplete }: ProjectDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, key: string}[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    let currentProgress = 0;

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      try {
        // Passo 1: Obter URL segura do servidor (S3/MinIO compatível)
        const { presignedUrl, secureKey } = await getPresignedUrl(file.name, file.type, projectPath);
        
        // Passo 2: Fazer o upload diretamente pro storage (Client -> MinIO) bypassando o Next.js
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Falha no envio via S3/MinIO");
        }

        setUploadedFiles(prev => [...prev, { name: file.name, key: secureKey }]);

        // Persistir no BD para aparecer no Admin/Agência e sobreviver refresh
        if (projectId) {
          await saveFileReference(projectId, file.name, secureKey, file.type, file.size);
          onUploadComplete?.();
        }
        
      } catch (err) {
        console.error("Erro no arquivo", file.name, err);
        alert(`Não foi possível enviar o arquivo: ${file.name}`);
      }
      
      currentProgress = Math.round(((i + 1) / acceptedFiles.length) * 100);
      setProgress(currentProgress);
    }

    setUploading(false);
    setProgress(0);
  }, [projectPath, projectId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      
      {/* Dropzone Area */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }`}
        style={{ borderColor: isDragActive ? themeColor : undefined }}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 animate-spin text-slate-400" />
            <p className="font-semibold text-slate-700">Enviando materiais...</p>
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full transition-all duration-300" 
                style={{ width: `${progress}%`, backgroundColor: themeColor }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
            >
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {isDragActive ? 'Solte para enviar' : 'Arraste seus arquivos aqui'}
            </h3>
            <p className="text-slate-500 max-w-[250px]">
              Adicione imagens, textos, PDFs ou arquivos ZIP para a {agencyName} iniciar o seu projeto.
            </p>
            <div className="mt-4 px-6 py-2 rounded-full font-medium" style={{ backgroundColor: themeColor, color: '#fff' }}>
              Procurar nos Arquivos
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" /> 
            Arquivos Recebidos
          </h4>
          <ul className="space-y-3">
            {uploadedFiles.map((file, idx) => (
              <li key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
                </div>
                <button className="text-slate-400 hover:text-red-500 transition-colors p-1 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
    </div>
  );
}
