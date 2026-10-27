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
        <div className="p-3 rounded-xl border border-[#36D6B0]/30 bg-[#36D6B0]/10 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#36D6B0]/20 border border-[#36D6B0]/30 flex items-center justify-center text-[#36D6B0] flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-semibold text-[#36D6B0] tracking-wider block">
                Selected Project Folder
              </span>
              <div className="text-xs font-semibold text-[#E8ECF5] truncate mt-0.5">
                {selectedPath.split('/').filter(Boolean).pop() || selectedPath}
              </div>
              <div className="text-[11px] font-mono text-[#9AA6BF] truncate mt-0.5">
                {selectedPath}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadDirectory(selectedPath)}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[#36D6B0] hover:bg-[#36D6B0]/15 border border-[#36D6B0]/25 transition-colors whitespace-nowrap"
          >
            Browse Here
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-dashed border-[#283149] bg-[#0B1020]/50 text-center text-xs text-[#9AA6BF]">
          Select a project directory below or use a quick shortcut.
        </div>
      )}

      {/* 2. Quick Location Shortcuts */}
      {browseData?.quick_locations && browseData.quick_locations.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium text-[#9AA6BF] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span>Quick Shortcuts:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {browseData.quick_locations.map((loc) => {
              const isSelected = selectedPath === loc.path;
              const isDemo = loc.name.toLowerCase().includes('demo');
              return (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleNavigateAndSelect(loc.path, loc.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-all ${
                    isSelected
                      ? 'bg-[#8B7CFF] text-white border-[#8B7CFF]'
                      : isDemo
                      ? 'bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/30 hover:bg-[#8B7CFF]/25'
                      : 'bg-[#141B2D] text-[#E8ECF5] border-[#283149] hover:bg-[#1B243B] hover:border-[#8B7CFF]/40'
                  }`}
                >
                  {isDemo ? (
                    <Sparkles className="w-3 h-3 text-[#8B7CFF]" />
                  ) : (
                    <HardDrive className="w-3 h-3 text-[#9AA6BF]" />
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
              className="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border border-[#8B7CFF]/30 bg-[#1B243B] text-[#E8ECF5] hover:bg-[#222D4A] hover:border-[#8B7CFF] transition-all ml-auto"
            >
              <Laptop className="w-3.5 h-3.5 text-[#8B7CFF]" />
              <span>{isPickingNative ? 'Opening Finder...' : 'Choose in Finder'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Interactive Directory Browser Container */}
      <div className="border border-[#283149] rounded-xl bg-[#0B1020] overflow-hidden shadow-sm space-y-0">
        {/* Navigation Toolbar */}
        <div className="p-2.5 bg-[#141B2D] border-b border-[#283149] flex items-center justify-between gap-2 text-xs">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 py-0.5 font-mono text-[11px] text-[#9AA6BF]">
            <button
              type="button"
              onClick={() => loadDirectory('/')}
              className="hover:text-[#E8ECF5] hover:underline px-1 py-0.5 rounded"
            >
              /
            </button>
            {breadcrumbSegments.map((seg, idx) => {
              const segPath = '/' + breadcrumbSegments.slice(0, idx + 1).join('/');
              const isLast = idx === breadcrumbSegments.length - 1;
              return (
                <React.Fragment key={segPath}>
                  <ChevronRight className="w-3 h-3 text-[#283149] flex-shrink-0" />
                  <button
                    type="button"
                    onClick={() => loadDirectory(segPath)}
                    className={`truncate max-w-[120px] px-1 py-0.5 rounded transition-colors ${
                      isLast
                        ? 'text-[#8B7CFF] font-semibold'
                        : 'hover:text-[#E8ECF5] hover:underline'
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
              className="px-2 py-1 rounded-md bg-[#1B243B] hover:bg-[#222D4A] border border-[#283149] text-[#E8ECF5] text-[11px] font-medium flex items-center gap-1 transition-colors flex-shrink-0"
              title="Go to parent directory"
            >
              <ArrowUp className="w-3 h-3" />
              <span>Up</span>
            </button>
          )}
        </div>

        {/* Current Folder Selection Action Bar */}
        <div className="px-3 py-2 bg-[#141B2D]/60 border-b border-[#283149]/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-[#9AA6BF]">Current:</span>
            <span className="text-xs font-semibold text-[#E8ECF5] truncate font-mono">
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
                ? 'bg-[#36D6B0] text-[#0B1020]'
                : 'bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white shadow-xs'
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
          <div className="p-2 border-b border-[#283149] bg-[#0B1020]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9AA6BF] absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter subfolders..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-[#141B2D] border border-[#283149] rounded-lg pl-8 pr-2.5 py-1 text-xs text-[#E8ECF5] placeholder-[#9AA6BF]/50 focus:outline-none focus:border-[#8B7CFF]"
              />
            </div>
          </div>
        )}

        {/* Subdirectory List */}
        <div className="max-h-56 overflow-y-auto divide-y divide-[#283149]/50">
          {loading ? (
            <div className="p-6 text-center text-xs text-[#9AA6BF]">Loading directories...</div>
          ) : filteredFolders.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#9AA6BF] space-y-1">
              <p>No subfolders found in this directory.</p>
              <button
                type="button"
                onClick={() =>
                  browseData?.current_path &&
                  handleSelectFolder(browseData.current_path, browseData.current_name)
                }
                className="text-[#8B7CFF] hover:underline font-medium text-xs mt-1"
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
                      ? 'bg-[#8B7CFF]/15 border-l-2 border-[#8B7CFF]'
                      : 'hover:bg-[#141B2D] text-[#E8ECF5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder
                      className={`w-4 h-4 flex-shrink-0 ${
                        folder.is_git
                          ? 'text-[#8B7CFF]'
                          : folder.is_python || folder.is_node
                          ? 'text-[#36D6B0]'
                          : 'text-[#9AA6BF]'
                      }`}
                    />
                    <span className="font-medium text-[#E8ECF5] truncate">{folder.name}</span>

                    {/* Tech Badges */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {folder.is_git && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#8B7CFF]/20 text-[#8B7CFF] border border-[#8B7CFF]/30">
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
                          ? 'bg-[#36D6B0] text-[#0B1020]'
                          : 'bg-[#1B243B] hover:bg-[#8B7CFF] text-[#E8ECF5] hover:text-white border border-[#283149]'
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
                      className="p-1 rounded hover:bg-[#1B243B] text-[#9AA6BF] hover:text-[#E8ECF5]"
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
          className="text-[11px] text-[#9AA6BF] hover:text-[#E8ECF5] font-medium transition-colors flex items-center gap-1"
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
              className="w-full px-3 py-1.5 rounded-lg border border-[#283149] bg-[#0B1020] text-[#E8ECF5] focus:outline-none focus:border-[#8B7CFF] font-mono text-xs"
            />
            <span className="text-[10px] text-[#9AA6BF] block">
              You can paste any local directory path here.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
