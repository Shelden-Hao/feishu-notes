import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role?: string
}

interface Document {
  _id: string
  title: string
  content: string
  author: {
    _id: string
    name: string
    email: string
    avatar?: string
  }
  folder?: {
    _id: string
    name: string
    color: string
  }
  collaborators: Array<{
    user: {
      _id: string
      name: string
      email: string
      avatar?: string
    }
    permission: 'read' | 'write' | 'admin'
    addedAt: string
  }>
  tags: string[]
  isPublic: boolean
  version: number
  viewCount: number
  createdAt: string
  updatedAt: string
}

interface Folder {
  _id: string
  name: string
  description?: string
  owner: {
    _id: string
    name: string
    email: string
  }
  parent?: {
    _id: string
    name: string
  }
  color: string
  createdAt: string
  updatedAt: string
  children?: Folder[]
}

interface AppState {
  // 用户状态
  user: User | null
  token: string | null
  isAuthenticated: boolean

  // 文档状态
  documents: Document[]
  currentDocument: Document | null

  // 文件夹状态
  folders: Folder[]
  folderTree: Folder[]
  currentFolder: Folder | null

  // UI 状态
  sidebarOpen: boolean
  isLoading: boolean
  searchQuery: string

  // Actions
  setUser: (user: User, token: string) => void
  logout: () => void
  setDocuments: (documents: Document[]) => void
  setCurrentDocument: (document: Document | null) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  addDocument: (document: Document) => void
  removeDocument: (id: string) => void
  setFolders: (folders: Folder[]) => void
  setFolderTree: (tree: Folder[]) => void
  setCurrentFolder: (folder: Folder | null) => void
  addFolder: (folder: Folder) => void
  updateFolder: (id: string, updates: Partial<Folder>) => void
  removeFolder: (id: string) => void
  setSidebarOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,
      documents: [],
      currentDocument: null,
      folders: [],
      folderTree: [],
      currentFolder: null,
      sidebarOpen: true,
      isLoading: false,
      searchQuery: '',

      // Actions
      setUser: (user, token) => set({
        user,
        token,
        isAuthenticated: true
      }),

      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
        currentDocument: null,
        documents: [],
        folders: [],
        folderTree: [],
        currentFolder: null
      }),

      setDocuments: (documents) => set({ documents }),

      setCurrentDocument: (document) => set({ currentDocument: document }),

      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map(doc =>
          doc._id === id ? { ...doc, ...updates } : doc
        ),
        currentDocument: state.currentDocument?._id === id
          ? { ...state.currentDocument, ...updates }
          : state.currentDocument
      })),

      addDocument: (document) => set((state) => ({
        documents: [document, ...state.documents]
      })),

      removeDocument: (id) => set((state) => ({
        documents: state.documents.filter(doc => doc._id !== id),
        currentDocument: state.currentDocument?._id === id ? null : state.currentDocument
      })),

      setFolders: (folders) => set({ folders }),

      setFolderTree: (tree) => set({ folderTree: tree }),

      setCurrentFolder: (folder) => set({ currentFolder: folder }),

      addFolder: (folder) => set((state) => ({
        folders: [folder, ...state.folders]
      })),

      updateFolder: (id, updates) => set((state) => ({
        folders: state.folders.map(folder =>
          folder._id === id ? { ...folder, ...updates } : folder
        ),
        currentFolder: state.currentFolder?._id === id
          ? { ...state.currentFolder, ...updates }
          : state.currentFolder
      })),

      removeFolder: (id) => set((state) => ({
        folders: state.folders.filter(folder => folder._id !== id),
        currentFolder: state.currentFolder?._id === id ? null : state.currentFolder
      })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setLoading: (loading) => set({ isLoading: loading }),

      setSearchQuery: (query) => set({ searchQuery: query })
    }),
    {
      name: 'feishu-notes-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)