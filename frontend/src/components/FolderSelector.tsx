import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Folder,
  FolderPlus,
  FolderGit2,
  ChevronRight,
  ArrowUp,
  Search,
  CheckCircle2,
  HardDrive,
  Compass,
  Laptop,
  Layers,
  Sparkles
} from 'lucide-react';

interface Props {
  selectedPath: string;
  onSelect: (path: string, folderName?: string) => void;
  className?: string;
}

export const FolderSelector: React.FC<Props> = ({
  selectedPath,
  onSelect,
  className = ''
}) => {
  const [browseData, setBrowseData] = useState<{
    current_path: string;
    current_name: string;
    parent_path: string | null;
    folders: Array<{
      name: string;
      path: string;
      is_git: boolean;
      is_node: boolean;
      is_python: boolean;
    }>;
    quick_locations: Array<{
      name: string;
      path: string;
    }>;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>('');
  const [isPickingNative, setIsPickingNative] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  useEffect(() => {
    loadDirectory(selectedPath || undefined);
  }, []);

  const loadDirectory = async (path?: string) => {
    setLoading(true);
    try {
      const data = await api.browseDirectories(path);
      setBrowseData(data);
      setFilterText('');
    } catch (err) {
      console.error('Failed to browse directories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFolder = (path: string, name?: string) => {
    onSelect(path, name);
  };

  const handleNavigateAndSelect = (path: string, name?: string) => {
    onSelect(path, name);
    loadDirectory(path);
  };

  const handleNativePicker = async () => {
    setIsPickingNative(true);
    try {
      const res = await api.pickDirectoryNative();
      if (res.success && res.path) {
        onSelect(res.path, res.name);
        loadDirectory(res.path);
      }
    } catch (e) {
      console.error('Native picker error:', e);
    } finally {
      setIsPickingNative(false);
    }
  };

  // Build breadcrumb segments from current path
  const breadcrumbSegments = browseData?.current_path
    ? browseData.current_path.split('/').filter(Boolean)
    : [];

  const filteredFolders = (browseData?.folders || []).filter((f) =>
    f.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* 1. Selected Folder Status Banner */}
      {selectedPath ? (
        <div className="p-3 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-semibold text-[#10B981] tracking-wider block">
                Selected Project Folder
              </span>
              <div className="text-xs font-semibold text-[#E6EBF2] truncate mt-0.5">
                {selectedPath.split('/').filter(Boolean).pop() || selectedPath}
              </div>
              <div className="text-[11px] font-mono text-[#8A97AC] truncate mt-0.5">
                {selectedPath}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadDirectory(selectedPath)}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[#10B981] hover:bg-[#10B981]/15 border border-[#10B981]/25 transition-colors whitespace-nowrap"
          >
            Browse Here
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-dashed border-[#232B38] bg-[#0A0E14]/50 text-center text-xs text-[#8A97AC]">
          Select a project directory below or use a quick shortcut.
        </div>
      )}

      {/* 2. Quick Location Shortcuts */}
      {browseData?.quick_locations && browseData.quick_locations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-[#8A97AC] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Quick Shortcuts:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {browseData.quick_locations.map((loc) => {
              const isSelected = selectedPath === loc.path;
              const isSpecial = loc.name.toLowerCase().includes('security lab');
              return (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleNavigateAndSelect(loc.path, loc.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-all ${
                    isSelected
                      ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                      : isSpecial
                      ? 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30 hover:bg-[#3B82F6]/25'
                      : 'bg-[#141A24] text-[#E6EBF2] border-[#232B38] hover:bg-[#1B222E] hover:border-[#3B82F6]/40'
                  }`}
                >
                  {isSpecial ? (
                    <Sparkles className="w-3 h-3 text-[#3B82F6]" />
                  ) : (
                    <HardDrive className="w-3 h-3 text-[#8A97AC]" />
                  )}
                  <span>{loc.name}</span>
                </button>
              );
            })}

            {/* Native OS Dialog Button */}
            <button
              type="button"
              onClick={handleNativePicker}
              disabled={isPickingNative}
              className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border border-[#3B82F6]/30 bg-[#1B222E] text-[#E6EBF2] hover:bg-[#222B38] hover:border-[#3B82F6] transition-all ml-auto"
            >
              <Laptop className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>{isPickingNative ? 'Opening Finder...' : 'Choose in Finder'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Interactive Directory Browser Container */}
      <div className="border border-[#232B38] rounded-xl bg-[#0A0E14] overflow-hidden shadow-sm space-y-0">
        {/* Navigation Toolbar */}
        <div className="p-2.5 bg-[#141A24] border-b border-[#232B38] flex items-center justify-between gap-2 text-xs">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 py-0.5 font-mono text-[11px] text-[#8A97AC]">
            <button
              type="button"
              onClick={() => loadDirectory('/')}
              className="hover:text-[#E6EBF2] hover:underline px-1 py-0.5 rounded"
            >
              /
            </button>
            {breadcrumbSegments.map((seg, idx) => {
              const segPath = '/' + breadcrumbSegments.slice(0, idx + 1).join('/');
              const isLast = idx === breadcrumbSegments.length - 1;
              return (
                <React.Fragment key={segPath}>
                  <ChevronRight className="w-3 h-3 text-[#232B38] flex-shrink-0" />
                  <button
                    type="button"
                    onClick={() => loadDirectory(segPath)}
                    className={`truncate max-w-[120px] px-1 py-0.5 rounded transition-colors ${
                      isLast
                        ? 'text-[#3B82F6] font-semibold'
                        : 'hover:text-[#E6EBF2] hover:underline'
                    }`}
                  >
                    {seg}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Up One Level Button */}
          {browseData?.parent_path && (
            <button
              type="button"
              onClick={() => loadDirectory(browseData.parent_path!)}
              className="px-2 py-1 rounded-md bg-[#1B222E] hover:bg-[#222B38] border border-[#232B38] text-[#E6EBF2] text-[11px] font-medium flex items-center gap-1 transition-colors flex-shrink-0"
              title="Go to parent directory"
            >
              <ArrowUp className="w-3 h-3" />
              <span>Up</span>
            </button>
          )}
        </div>

        {/* Current Folder Selection Action Bar */}
        <div className="px-3 py-2 bg-[#141A24]/60 border-b border-[#232B38]/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-[#8A97AC]">Current:</span>
            <span className="text-xs font-semibold text-[#E6EBF2] truncate font-mono">
              {browseData?.current_name || 'root'}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              browseData?.current_path &&
              handleSelectFolder(browseData.current_path, browseData.current_name)
            }
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
              selectedPath === browseData?.current_path
                ? 'bg-[#10B981] text-[#0A0E14]'
                : 'bg-[#3B82F6] hover:bg-[#2F6FE0] text-white shadow-xs'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {selectedPath === browseData?.current_path
                ? 'Current Folder Selected'
                : `Select "${browseData?.current_name || 'Current Folder'}"`}
            </span>
          </button>
        </div>

        {/* Search filter for subfolders */}
        {(browseData?.folders?.length || 0) > 4 && (
          <div className="p-2 border-b border-[#232B38] bg-[#0A0E14]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8A97AC] absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter subfolders..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-[#141A24] border border-[#232B38] rounded-lg pl-8 pr-2.5 py-1 text-xs text-[#E6EBF2] placeholder-[#8A97AC]/50 focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>
        )}

        {/* Subdirectory List */}
        <div className="max-h-56 overflow-y-auto divide-y divide-[#232B38]/50">
          {loading ? (
            <div className="p-6 text-center text-xs text-[#8A97AC]">Loading directories...</div>
          ) : filteredFolders.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#8A97AC] space-y-1">
              <p>No subfolders found in this directory.</p>
              <button
                type="button"
                onClick={() =>
                  browseData?.current_path &&
                  handleSelectFolder(browseData.current_path, browseData.current_name)
                }
                className="text-[#3B82F6] hover:underline font-medium text-xs mt-1"
              >
                Click here to use "{browseData?.current_name}" as your project
              </button>
            </div>
          ) : (
            filteredFolders.map((folder) => {
              const isSelected = selectedPath === folder.path;
              return (
                <div
                  key={folder.path}
                  onClick={() => handleSelectFolder(folder.path, folder.name)}
                  className={`p-2.5 px-3 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#3B82F6]/15 border-l-2 border-[#3B82F6]'
                      : 'hover:bg-[#141A24] text-[#E6EBF2]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder
                      className={`w-4 h-4 flex-shrink-0 ${
                        folder.is_git
                          ? 'text-[#3B82F6]'
                          : folder.is_python || folder.is_node
                          ? 'text-[#10B981]'
                          : 'text-[#8A97AC]'
                      }`}
                    />
                    <span className="font-medium text-[#E6EBF2] truncate">{folder.name}</span>

                    {/* Tech Badges */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {folder.is_git && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30">
                          git
                        </span>
                      )}
                      {folder.is_python && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          py
                        </span>
                      )}
                      {folder.is_node && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          node
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectFolder(folder.path, folder.name);
                      }}
                      className={`px-2 py-0.8 rounded text-[11px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-[#10B981] text-[#0A0E14]'
                          : 'bg-[#1B222E] hover:bg-[#3B82F6] text-[#E6EBF2] hover:text-white border border-[#232B38]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>

                    <button
                      type="button"
                      title="Open and explore subfolder"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadDirectory(folder.path);
                      }}
                      className="p-1 rounded hover:bg-[#1B222E] text-[#8A97AC] hover:text-[#E6EBF2]"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Manual Path Input Toggle (Optional Fallback) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[11px] text-[#8A97AC] hover:text-[#E6EBF2] font-medium transition-colors flex items-center gap-1"
        >
          <span>{showManualInput ? '− Hide manual path input' : '+ Or enter exact path manually'}</span>
        </button>

        {showManualInput && (
          <div className="mt-2 space-y-1">
            <input
              type="text"
              placeholder="/Users/username/projects/my-app"
              value={selectedPath}
              onChange={(e) => onSelect(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-[#232B38] bg-[#0A0E14] text-[#E6EBF2] focus:outline-none focus:border-[#3B82F6] font-mono text-xs"
            />
            <span className="text-[10px] text-[#8A97AC] block">
              You can paste any local directory path here.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
