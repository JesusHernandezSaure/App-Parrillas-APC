import React, { useState } from 'react';
import { Post } from '../types';
import { RichTextDisplay } from './RichTextDisplay';
import { 
  Type, AlignLeft, Link2, ExternalLink, Palette, Film, 
  Copy, Check, Edit3, FolderCheck, AlertCircle 
} from 'lucide-react';

interface PostContentFourPanelsProps {
  post: Post;
  onEdit?: () => void;
  canEdit?: boolean;
  className?: string;
}

export const PostContentFourPanels: React.FC<PostContentFourPanelsProps> = ({
  post,
  onEdit,
  canEdit = false,
  className = ''
}) => {
  const [copiedLink, setCopiedLink] = useState<'ref' | 'mat' | 'edit' | null>(null);

  const copyToClipboard = (text: string, type: 'ref' | 'mat' | 'edit', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const isVideo = post.tipoMaterial === 'Video' || (post.dimensiones && post.dimensiones.includes('9:16'));

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs ${className}`}>
      
      {/* 1. DIVISIÓN: COPY IN */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Type className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Copy In
              </span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              En Imagen
            </span>
          </div>

          <div className="text-xs text-slate-700 min-h-[50px] max-h-36 overflow-y-auto pr-1">
            <RichTextDisplay 
              content={post.copyIn} 
              fallbackText="Sin copy in redactado" 
              showCopyButton={false} 
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar</span>
            </button>
          )}
          {post.copyIn && (
            <button
              type="button"
              onClick={(e) => copyToClipboard(post.copyIn, 'ref', e)}
              className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 ml-auto cursor-pointer transition-colors"
              title="Copiar texto de Copy In"
            >
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. DIVISIÓN: COPY OUT */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
                <AlignLeft className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Copy Out
              </span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">
              Caption
            </span>
          </div>

          <div className="text-xs text-slate-700 min-h-[50px] max-h-36 overflow-y-auto pr-1">
            <RichTextDisplay 
              content={post.copyOut} 
              fallbackText="Sin copy out / caption" 
              showCopyButton={false} 
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar</span>
            </button>
          )}
          {post.copyOut && (
            <button
              type="button"
              onClick={(e) => copyToClipboard(post.copyOut, 'ref', e)}
              className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 ml-auto cursor-pointer transition-colors"
              title="Copiar caption de Copy Out"
            >
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. DIVISIÓN: ENLACE DE REFERENCIA */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                <Link2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Enlace de Referencia
              </span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              Inspiración / Brief
            </span>
          </div>

          <div className="text-xs min-h-[50px] flex flex-col justify-center">
            {post.enlaceReferencia ? (
              <a
                href={post.enlaceReferencia}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-2 rounded-lg bg-amber-50/60 border border-amber-200/80 hover:bg-amber-100/70 hover:border-amber-300 transition-all flex items-center gap-2 text-amber-900"
                title={post.enlaceReferencia}
              >
                <div className="w-7 h-7 rounded-md bg-white border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 group-hover:scale-105 transition-transform">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs truncate text-amber-950">Abrir Referencia</p>
                  <p className="text-[10px] text-amber-700 truncate font-mono">
                    {post.enlaceReferencia.replace(/^https?:\/\/(www\.)?/, '')}
                  </p>
                </div>
              </a>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-center text-[11px] italic">
                Sin enlace de referencia
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          {post.enlaceReferencia ? (
            <button
              type="button"
              onClick={(e) => copyToClipboard(post.enlaceReferencia, 'ref', e)}
              className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedLink === 'ref' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar link</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] text-slate-400">No especificado</span>
          )}

          {canEdit && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 ml-auto cursor-pointer transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. DIVISIÓN: MATERIAL ENTREGADO (ARTE / AUDIO Y VIDEO) */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                {isVideo ? <Film className="w-3.5 h-3.5" /> : <Palette className="w-3.5 h-3.5" />}
              </div>
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Material Arte / AV
              </span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              post.enlaceMaterialFinal 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-50 text-amber-800'
            }`}>
              {post.enlaceMaterialFinal ? 'Entregado' : 'Pendiente'}
            </span>
          </div>

          <div className="text-xs min-h-[50px] flex flex-col justify-center space-y-1.5">
            {post.enlaceMaterialFinal ? (
              <a
                href={post.enlaceMaterialFinal}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300 transition-all flex items-center gap-2 text-emerald-950"
                title={post.enlaceMaterialFinal}
              >
                <div className="w-7 h-7 rounded-md bg-white border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <FolderCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs truncate text-emerald-950">Material Entregado</p>
                  <p className="text-[10px] text-emerald-700 truncate font-mono">
                    OneDrive / Drive / Cloud
                  </p>
                </div>
              </a>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-center text-[11px] italic flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3 text-slate-400" />
                <span>Pendiente ({post.areaResponsable})</span>
              </div>
            )}

            {/* Si además tiene editables entregados por arte */}
            {post.enlaceEditableArte && (
              <a
                href={post.enlaceEditableArte}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 hover:bg-purple-100 text-[10px] font-semibold flex items-center gap-1.5 transition-colors"
                title="Editables Arte (Figma, Illustrator, PSD)"
              >
                <ExternalLink className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="truncate">Editables de Arte</span>
              </a>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          {post.enlaceMaterialFinal ? (
            <button
              type="button"
              onClick={(e) => copyToClipboard(post.enlaceMaterialFinal, 'mat', e)}
              className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedLink === 'mat' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar link</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] text-slate-400">
              Resp: {post.responsableActualName || post.areaResponsable}
            </span>
          )}

          {canEdit && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 ml-auto cursor-pointer transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
