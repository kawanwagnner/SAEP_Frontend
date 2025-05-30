import { useState, useEffect } from "react";
import axios from "axios";
import {
  Sun,
  Moon,
  Plus,
  Trash2,
  CheckCircle,
  LogIn,
  UserPlus,
  LogOut,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import "./index.css";

// Configura axios
const api = axios.create({
  baseURL: "http://localhost:3001/api",
});

// Endpoints conforme especificação
const ROUTES = {
  register: "/users/register",
  login: "/users/login",
  me: "/users/me",
  getTodos: "/todos/getTasks",
  createTodo: "/todos/sendTask",
  updateTodo: "/todos/",
};

// Componente de Feedback
const FeedbackMessage = ({ type, message }) => {
  const styles = {
    success: "bg-green-100 border-green-400 text-green-700",
    error: "bg-red-100 border-red-400 text-red-700",
    info: "bg-blue-100 border-blue-400 text-blue-700",
  };

  return (
    <div
      className={`${styles[type]} border px-4 py-3 rounded mb-4 flex items-center gap-2`}
    >
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
};

// Componente de Loading
const LoadingSpinner = () => (
  <div className="flex justify-center py-8">
    <Loader2 className="animate-spin text-indigo-600" size={32} />
  </div>
);

export default function App() {
  // Estado da aplicação
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: null });

  // Aplica tema
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Inicialização
  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      loadUserData();
    }
  }, [token]);

  // Carrega dados do usuário e tarefas
  async function loadUserData() {
    try {
      setLoading(true);
      await Promise.all([loadProfile(), loadTodos()]);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  // Carrega perfil
  async function loadProfile() {
    try {
      const { data } = await api.get(ROUTES.me);
      setUser(data);
    } catch (error) {
      handleError(error);
      handleLogout();
    }
  }

  // Carrega tarefas
  async function loadTodos() {
    try {
      const { data } = await api.get(ROUTES.getTodos);
      setTodos(data);
    } catch (error) {
      handleError(error);
    }
  }

  // Logout
  function handleLogout() {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setTodos([]);
    showFeedback("info", "Você saiu da sua conta");
  }

  // Tratamento de erros
  function handleError(error) {
    const message = error.response?.data?.error || "Ocorreu um erro";
    showFeedback("error", message);
    console.error(error);
  }

  // Feedback visual
  function showFeedback(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: null, message: null }), 5000);
  }

  // Formulário de autenticação
  const [authMode, setAuthMode] = useState("login");
  const authFormik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
    },
    validationSchema: Yup.object().shape({
      name:
        authMode === "register"
          ? Yup.string().required("Nome é obrigatório")
          : Yup.string(),
      email: Yup.string()
        .email("Email inválido")
        .required("Email é obrigatório"),
      password: Yup.string()
        .min(authMode === "register" ? 6 : 1, "Mínimo 6 caracteres")
        .required("Senha é obrigatória"),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const endpoint = authMode === "login" ? ROUTES.login : ROUTES.register;
        const { data } = await api.post(endpoint, values);

        if (authMode === "login") {
          setToken(data.token);
          localStorage.setItem("token", data.token);
          setUser(data.user); // Adiciona esta linha para atualizar o usuário
          showFeedback("success", `Bem-vindo, ${data.user.name}!`);
        } else {
          setAuthMode("login");
          showFeedback("success", "Conta criada com sucesso! Faça login");
        }
      } catch (error) {
        handleError(error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Formulário de tarefas
  const todoFormik = useFormik({
    initialValues: {
      title: "",
      category: "",
      priority: "média",
      completed: false,
    },
    validationSchema: Yup.object({
      title: Yup.string()
        .min(3, "Mínimo 3 caracteres")
        .required("Título é obrigatório"),
      category: Yup.string().required("Categoria é obrigatória"),
      priority: Yup.string().oneOf(["baixa", "média", "alta"]).required(),
    }),
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        await api.post(
          ROUTES.createTodo,
          {
            title: values.title,
            priority: values.priority,
            category: values.category,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`, // Corrigido aqui
            },
          }
        );
        await loadTodos();
        resetForm();
        showFeedback("success", "Tarefa adicionada!");
      } catch (error) {
        handleError(error);
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Ações CRUD
  const toggleComplete = async (id, completed) => {
    try {
      await api.put(`${ROUTES.updateTodo}${id}`, { completed: !completed });
      await loadTodos();
    } catch (error) {
      handleError(error);
    }
  };

  const removeTodo = async (id) => {
    try {
      await api.delete(`${ROUTES.updateTodo}${id}`);
      await loadTodos();
      showFeedback("success", "Tarefa removida");
    } catch (error) {
      handleError(error);
    }
  };

  // UI de autenticação
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-900 dark:to-zinc-800 transition-colors duration-300">
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-800 rounded-xl shadow-lg transition-all">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">
              <LogIn
                className="text-indigo-600 dark:text-indigo-400"
                size={28}
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6 text-center text-zinc-800 dark:text-white">
            {authMode === "login" ? "Acesse sua conta" : "Crie sua conta"}
          </h2>

          {feedback.message && (
            <FeedbackMessage type={feedback.type} message={feedback.message} />
          )}

          <form onSubmit={authFormik.handleSubmit} className="space-y-4">
            {authMode === "register" && (
              <div>
                <input
                  name="name"
                  placeholder="Nome completo"
                  onChange={authFormik.handleChange}
                  value={authFormik.values.name}
                  className={`w-full p-3 rounded-lg border bg-white dark:bg-zinc-700/50 dark:border-zinc-600 ${
                    authFormik.errors.name
                      ? "border-red-500"
                      : "border-zinc-300"
                  }`}
                />
                {authFormik.errors.name && (
                  <p className="mt-1 text-sm text-red-500">
                    {authFormik.errors.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <input
                name="email"
                type="email"
                placeholder="Email"
                onChange={authFormik.handleChange}
                value={authFormik.values.email}
                className={`w-full p-3 rounded-lg border bg-white dark:bg-zinc-700/50 dark:border-zinc-600 ${
                  authFormik.errors.email ? "border-red-500" : "border-zinc-300"
                }`}
              />
              {authFormik.errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {authFormik.errors.email}
                </p>
              )}
            </div>

            <div>
              <input
                name="password"
                type="password"
                placeholder="Senha"
                onChange={authFormik.handleChange}
                value={authFormik.values.password}
                className={`w-full p-3 rounded-lg border bg-white dark:bg-zinc-700/50 dark:border-zinc-600 ${
                  authFormik.errors.password
                    ? "border-red-500"
                    : "border-zinc-300"
                }`}
              />
              {authFormik.errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {authFormik.errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={authFormik.isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-70"
            >
              {authFormik.isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : authMode === "login" ? (
                <>
                  <LogIn size={18} />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Registrar
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {authMode === "login"
              ? "Não tem uma conta?"
              : "Já possui uma conta?"}{" "}
            <button
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                authFormik.resetForm();
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              {authMode === "login" ? "Criar conta" : "Fazer login"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // UI principal
  return (
    <div className="min-h-screen px-4 py-8 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Olá, {user?.name}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {todos.filter((t) => !t.completed).length} tarefas pendentes
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Alternar tema"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Feedback */}
        {feedback.message && (
          <FeedbackMessage type={feedback.type} message={feedback.message} />
        )}

        {/* Formulário de tarefa */}
        <form
          onSubmit={todoFormik.handleSubmit}
          className="mb-8 bg-white dark:bg-zinc-700/20 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 transition-all"
        >
          <h2 className="text-lg font-semibold mb-4">Adicionar nova tarefa</h2>

          <div className="space-y-4">
            <div>
              <input
                name="title"
                placeholder="Título da tarefa"
                value={todoFormik.values.title}
                onChange={todoFormik.handleChange}
                className={`w-full p-3 rounded-lg bg-zinc-100 dark:bg-zinc-700/50 border ${
                  todoFormik.errors.title
                    ? "border-red-500"
                    : "border-zinc-300 dark:border-zinc-600"
                }`}
              />
              {todoFormik.errors.title && (
                <p className="mt-1 text-sm text-red-500">
                  {todoFormik.errors.title}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  name="category"
                  placeholder="Categoria"
                  value={todoFormik.values.category}
                  onChange={todoFormik.handleChange}
                  className={`w-full p-3 rounded-lg bg-zinc-100 dark:bg-zinc-700/50 border ${
                    todoFormik.errors.category
                      ? "border-red-500"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                />
                {todoFormik.errors.category && (
                  <p className="mt-1 text-sm text-red-500">
                    {todoFormik.errors.category}
                  </p>
                )}
              </div>

              <div>
                <select
                  name="priority"
                  value={todoFormik.values.priority}
                  onChange={todoFormik.handleChange}
                  className="w-full p-3 rounded-lg bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-300 dark:border-zinc-600"
                >
                  <option value="baixa">Baixa prioridade</option>
                  <option value="média">Média prioridade</option>
                  <option value="alta">Alta prioridade</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={todoFormik.isSubmitting || !todoFormik.dirty}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {todoFormik.isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Plus size={18} />
                  Adicionar Tarefa
                </>
              )}
            </button>
          </div>
        </form>

        {/* Lista de tarefas */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Suas Tarefas</h2>

          {loading ? (
            <LoadingSpinner />
          ) : todos.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              Nenhuma tarefa encontrada. Adicione sua primeira tarefa!
            </div>
          ) : (
            <ul className="space-y-3">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className={`p-4 rounded-lg border flex justify-between items-center transition-all ${
                    todo.completed
                      ? "bg-green-50/50 dark:bg-green-900/20 border-green-300 dark:border-green-800"
                      : "bg-white dark:bg-zinc-700/20 border-zinc-200 dark:border-zinc-700 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleComplete(todo.id, todo.completed)}
                      className={`mt-1 p-1 rounded-full ${
                        todo.completed
                          ? "text-green-500"
                          : "text-zinc-400 hover:text-indigo-500"
                      }`}
                    >
                      <CheckCircle size={20} />
                    </button>

                    <div>
                      <p
                        className={`font-medium ${
                          todo.completed
                            ? "line-through text-zinc-500 dark:text-zinc-400"
                            : ""
                        }`}
                      >
                        {todo.title}
                      </p>
                      <div className="flex gap-2 text-sm mt-1">
                        <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-700 rounded-full text-zinc-600 dark:text-zinc-300">
                          {todo.category}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full ${
                            todo.priority === "alta"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              : todo.priority === "média"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}
                        >
                          {todo.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeTodo(todo.id)}
                    className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
