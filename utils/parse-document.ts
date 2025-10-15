export type TOCType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface Options {
    selectors: TOCType[];
}

export interface Node {
  level: number;
  title: string;
  id: string;
  children: Node[];
}

/**
 * parseHtmlToToc - 将 HTML 字符串解析成标题树（h1-h6）
 * @param {string} htmlStr
 * @param {Object} options
 * @returns {Array} 树状数组，每个节点 { level, title, id, children: [] }
 */
function parseHtmlToToc(htmlStr: string, options: Options = { selectors: ['h1','h2','h3','h4','h5','h6'] }) {
    // ==处理节点的过程==
    const selectors = options.selectors || ['h1','h2','h3','h4','h5','h6'];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
  
    // 收集所有标题节点，按文档顺序
    const nodes: HTMLElement[] = Array.from(doc.querySelectorAll(selectors.join(',')));
  
    // 获取标题级别
    function getLevel(el: HTMLElement) {
      const tag = el.tagName.toLowerCase();
      const match = tag.match(/^h([1-6])$/);
      return match ? parseInt(match[1], 10) : (el.dataset && el.dataset.level ? Number(el.dataset.level): 1);
    }
  
    // 确保 id 存在 (用于链接)
    nodes.forEach((el: HTMLElement, idx: number) => {
      if (!el.id) {
        // 生成一个安全 id
        const slug = (el.textContent || 'heading').trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w-]/g,'');
        let id = slug || `heading-${idx}`;
        // 避免重复 id
        let i = 1;
        while (doc.getElementById(id)) {
          id = `${slug}-${i++}`;
        }
        el.id = id;
      }
    });
  
    // ==构造目录树的过程==
    const root: Node[] = [];
    const stack: Node[] = []; // 每项为节点对象 { level, title, id, children }
  
    nodes.forEach((el: HTMLElement) => {
      const level = getLevel(el as HTMLElement as HTMLElement);
      const node: Node = { level, title: el.textContent.trim(), id: el.id, children: [] };
  
      if (stack.length === 0) {
        root.push(node);
        stack.push(node);
      } else {
        // 比较 level 与栈顶
        while (stack.length && level <= stack[stack.length - 1].level) {
          // 如果 level 小于等于栈顶的 level，则弹出栈顶
          stack.pop();
        }
        if (stack.length === 0) {
          // 成为根级
          root.push(node);
          stack.push(node);
        } else {
          // 成为栈顶的子节点
          const parent = stack[stack.length - 1];
          parent.children.push(node);
          stack.push(node);
        }
      }
    });
  
    return root;
  }
  
  /** 将树渲染为 <ul> （可插入页面） */
  function renderTocToUl(tree: Node[]) {
    const ul = document.createElement('ul');
    tree.forEach((n: Node) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${n.id}`;
      a.textContent = n.title;
      li.appendChild(a);
      if (n.children && n.children.length) {
        li.appendChild(renderTocToUl(n.children));
      }
      ul.appendChild(li);
    });
    return ul;
  }
  
  /* 使用示例
  const html = `...`; // 从后端拿到的 string（HTML）
  const tocTree = parseHtmlToToc(html);
  document.getElementById('toc-container').appendChild(renderTocToUl(tocTree));
  console.log(JSON.stringify(tocTree, null, 2));
  */
  
  export { parseHtmlToToc, renderTocToUl }