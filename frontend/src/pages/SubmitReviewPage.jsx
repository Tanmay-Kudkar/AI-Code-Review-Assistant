import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { reviewsApi } from '../services/api';
import toast from 'react-hot-toast';
import { Code2, Upload, X, FileCode, Loader, ChevronRight, GitBranch, Zap } from 'lucide-react';
import Select from 'react-select';
import { setupMonacoTouch } from '../utils/monacoTouch';

import javascriptIcon from '../assets/languages/javascript.svg';
import typescriptIcon from '../assets/languages/typescript.svg';
import pythonIcon from '../assets/languages/python.svg';
import javaIcon from '../assets/languages/java.svg';
import cIcon from '../assets/languages/c.svg';
import cppIcon from '../assets/languages/cpp.svg';
import csharpIcon from '../assets/languages/csharp.svg';
import phpIcon from '../assets/languages/php.svg';
import rubyIcon from '../assets/languages/ruby.svg';
import goIcon from '../assets/languages/go.svg';
import rustIcon from '../assets/languages/rust.svg';

import htmlIcon from '../assets/icons/html.svg';
import cssIcon from '../assets/icons/css.svg';
import scssIcon from '../assets/icons/scss.svg';
import jsonIcon from '../assets/icons/json.svg';
import xmlIcon from '../assets/icons/xml.svg';
import markdownIcon from '../assets/icons/markdown.svg';
import shellIcon from '../assets/icons/shell.svg';
import swiftIcon from '../assets/icons/swift.svg';
import kotlinIcon from '../assets/icons/kotlin.svg';
import objectivecIcon from '../assets/icons/objective-c.svg';
import sqlIcon from '../assets/icons/sql.svg';
import scalaIcon from '../assets/icons/scala.svg';
import perlIcon from '../assets/icons/perl.svg';
import rIcon from '../assets/icons/r.svg';
import dartIcon from '../assets/icons/dart.svg';
import luaIcon from '../assets/icons/lua.svg';
import haskellIcon from '../assets/icons/haskell.svg';
import elixirIcon from '../assets/icons/elixir.svg';
import erlangIcon from '../assets/icons/erlang.svg';
import clojureIcon from '../assets/icons/clojure.svg';
import groovyIcon from '../assets/icons/groovy.svg';
import powershellIcon from '../assets/icons/powershell.svg';
import yamlIcon from '../assets/icons/yaml.svg';
import dockerfileIcon from '../assets/icons/dockerfile.svg';
import graphqlIcon from '../assets/icons/graphql.svg';

import reactIcon from '../assets/icons/react.svg';
import reactnativeIcon from '../assets/icons/react-native.svg';
import vueIcon from '../assets/icons/vue.svg';
import angularIcon from '../assets/icons/angular.svg';
import svelteIcon from '../assets/icons/svelte.svg';
import nextjsIcon from '../assets/icons/nextjs.svg';
import nuxtjsIcon from '../assets/icons/nuxtjs.svg';
import expressIcon from '../assets/icons/express.svg';
import nestjsIcon from '../assets/icons/nestjs.svg';
import djangoIcon from '../assets/icons/django.svg';
import fastapiIcon from '../assets/icons/fastapi.svg';
import flaskIcon from '../assets/icons/flask.svg';
import springbootIcon from '../assets/icons/springboot.svg';
import railsIcon from '../assets/icons/rails.svg';
import laravelIcon from '../assets/icons/laravel.svg';
import symfonyIcon from '../assets/icons/symfony.svg';
import aspnetIcon from '../assets/icons/aspnet.svg';
import flutterIcon from '../assets/icons/flutter.svg';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', icon: javascriptIcon },
  { value: 'typescript', label: 'TypeScript', icon: typescriptIcon },
  { value: 'python', label: 'Python', icon: pythonIcon },
  { value: 'java', label: 'Java', icon: javaIcon },
  { value: 'c', label: 'C', icon: cIcon },
  { value: 'cpp', label: 'C++', icon: cppIcon },
  { value: 'csharp', label: 'C#', icon: csharpIcon },
  { value: 'php', label: 'PHP', icon: phpIcon },
  { value: 'ruby', label: 'Ruby', icon: rubyIcon },
  { value: 'go', label: 'Go', icon: goIcon },
  { value: 'rust', label: 'Rust', icon: rustIcon },
  { value: 'html', label: 'HTML', icon: htmlIcon },
  { value: 'css', label: 'CSS', icon: cssIcon },
  { value: 'scss', label: 'SCSS', icon: scssIcon },
  { value: 'json', label: 'JSON', icon: jsonIcon },
  { value: 'xml', label: 'XML', icon: xmlIcon },
  { value: 'markdown', label: 'Markdown', icon: markdownIcon },
  { value: 'shell', label: 'Shell Script', icon: shellIcon },
  { value: 'swift', label: 'Swift', icon: swiftIcon },
  { value: 'kotlin', label: 'Kotlin', icon: kotlinIcon },
  { value: 'objective-c', label: 'Objective-C', icon: objectivecIcon },
  { value: 'sql', label: 'SQL', icon: sqlIcon },
  { value: 'scala', label: 'Scala', icon: scalaIcon },
  { value: 'perl', label: 'Perl', icon: perlIcon },
  { value: 'r', label: 'R', icon: rIcon },
  { value: 'dart', label: 'Dart', icon: dartIcon },
  { value: 'lua', label: 'Lua', icon: luaIcon },
  { value: 'haskell', label: 'Haskell', icon: haskellIcon },
  { value: 'elixir', label: 'Elixir', icon: elixirIcon },
  { value: 'erlang', label: 'Erlang', icon: erlangIcon },
  { value: 'clojure', label: 'Clojure', icon: clojureIcon },
  { value: 'groovy', label: 'Groovy', icon: groovyIcon },
  { value: 'powershell', label: 'PowerShell', icon: powershellIcon },
  { value: 'yaml', label: 'YAML', icon: yamlIcon },
  { value: 'dockerfile', label: 'Dockerfile', icon: dockerfileIcon },
  { value: 'graphql', label: 'GraphQL', icon: graphqlIcon },
];

const FRAMEWORKS = [
  { value: 'none', label: 'None / Vanilla' },
  { value: 'react', label: 'React', icon: reactIcon },
  { value: 'react-native', label: 'React Native', icon: reactnativeIcon },
  { value: 'vue', label: 'Vue.js', icon: vueIcon },
  { value: 'angular', label: 'Angular', icon: angularIcon },
  { value: 'svelte', label: 'Svelte', icon: svelteIcon },
  { value: 'nextjs', label: 'Next.js', icon: nextjsIcon },
  { value: 'nuxtjs', label: 'Nuxt.js', icon: nuxtjsIcon },
  { value: 'express', label: 'Express.js', icon: expressIcon },
  { value: 'nestjs', label: 'NestJS', icon: nestjsIcon },
  { value: 'django', label: 'Django', icon: djangoIcon },
  { value: 'fastapi', label: 'FastAPI', icon: fastapiIcon },
  { value: 'flask', label: 'Flask', icon: flaskIcon },
  { value: 'springboot', label: 'Spring Boot', icon: springbootIcon },
  { value: 'rails', label: 'Ruby on Rails', icon: railsIcon },
  { value: 'laravel', label: 'Laravel', icon: laravelIcon },
  { value: 'symfony', label: 'Symfony', icon: symfonyIcon },
  { value: 'aspnet', label: 'ASP.NET Core', icon: aspnetIcon },
  { value: 'flutter', label: 'Flutter', icon: flutterIcon },
];

const EXAMPLE_SNIPPETS = {
  javascript: `function calculateSum(arr) {\n  let sum = 0\n  for (var i = 0; i < arr.length; i++) {\n    sum = sum + arr[i]\n  }\n  return sum\n}\n\nconst unusedVar = "hello"\nconsole.log(calculateSum([1, 2, 3, 4, 5]))`,
  typescript: `function calculateSum(arr: number[]): number {\n  let sum = 0;\n  for (let i = 0; i < arr.length; i++) {\n    sum = sum + arr[i];\n  }\n  return sum;\n}\n\nconst unusedVar: string = "hello";\nconsole.log(calculateSum([1, 2, 3, 4, 5]));`,
  python: `def calculate_sum(numbers):\n    sum = 0\n    for i in range(len(numbers)):\n        sum = sum + numbers[i]\n    return sum\n\nunused_variable = "hello"\nprint(calculate_sum([1, 2, 3, 4, 5]))`,
  java: `public class Main {\n    public static int calculateSum(int[] arr) {\n        int sum = 0;\n        for (int i = 0; i < arr.length; i++) {\n            sum = sum + arr[i];\n        }\n        return sum;\n    }\n\n    public static void main(String[] args) {\n        String unusedVar = "hello";\n        int[] numbers = {1, 2, 3, 4, 5};\n        System.out.println(calculateSum(numbers));\n    }\n}`,
  c: `#include <stdio.h>\n\nint calculateSum(int arr[], int size) {\n    int sum = 0;\n    for (int i = 0; i < size; i++) {\n        sum = sum + arr[i];\n    }\n    return sum;\n}\n\nint main() {\n    char* unusedVar = "hello";\n    int numbers[] = {1, 2, 3, 4, 5};\n    printf("%d\\n", calculateSum(numbers, 5));\n    return 0;\n}`,
  cpp: `#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nint calculateSum(vector<int> arr) {\n    int sum = 0;\n    for (int i = 0; i < arr.size(); i++) {\n        sum = sum + arr[i];\n    }\n    return sum;\n}\n\nint main() {\n    string unusedVar = "hello";\n    vector<int> numbers = {1, 2, 3, 4, 5};\n    cout << calculateSum(numbers) << endl;\n    return 0;\n}`,
  csharp: `using System;\n\nclass Program {\n    static int CalculateSum(int[] arr) {\n        int sum = 0;\n        for (int i = 0; i < arr.Length; i++) {\n            sum = sum + arr[i];\n        }\n        return sum;\n    }\n\n    static void Main() {\n        string unusedVar = "hello";\n        int[] numbers = { 1, 2, 3, 4, 5 };\n        Console.WriteLine(CalculateSum(numbers));\n    }\n}`,
  php: `<?php\n\nfunction calculateSum($arr) {\n    $sum = 0;\n    for ($i = 0; $i < count($arr); $i++) {\n        $sum += $arr[$i];\n    }\n    return $sum;\n}\n\n$unusedVar = "hello";\necho calculateSum([1, 2, 3, 4, 5]);\n\n?>`,
  ruby: `def calculate_sum(arr)\n  sum = 0\n  for i in 0...arr.length\n    sum += arr[i]\n  end\n  return sum\nend\n\nunused_var = "hello"\nputs calculate_sum([1, 2, 3, 4, 5])`,
  go: `package main\n\nimport "fmt"\n\nfunc calculateSum(arr []int) int {\n\tsum := 0\n\tfor i := 0; i < len(arr); i++ {\n\t\tsum += arr[i]\n\t}\n\treturn sum\n}\n\nfunc main() {\n\tunusedVar := "hello"\n\t_ = unusedVar\n\tnumbers := []int{1, 2, 3, 4, 5}\n\tfmt.Println(calculateSum(numbers))\n}`,
  rust: `fn calculate_sum(arr: &[i32]) -> i32 {\n    let mut sum = 0;\n    for i in 0..arr.len() {\n        sum += arr[i];\n    }\n    sum\n}\n\nfn main() {\n    let unused_var = "hello";\n    let numbers = [1, 2, 3, 4, 5];\n    println!("{}", calculate_sum(&numbers));\n}`,
  
  html: `<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>`,
  css: `body {\n  margin: 0;\n  padding: 0;\n  background-color: #f0f0f0;\n}`,
  scss: `$primary-color: #333;\n\nbody {\n  color: $primary-color;\n}`,
  json: `{\n  "name": "example",\n  "version": "1.0.0"\n}`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>\n<note>\n  <to>User</to>\n  <from>System</from>\n  <heading>Reminder</heading>\n  <body>Hello</body>\n</note>`,
  markdown: `# Hello World\n\nThis is a markdown file.`,
  shell: `#!/bin/bash\n\necho "Hello World"\n`,
  swift: `import Foundation\n\nfunc calculateSum(arr: [Int]) -> Int {\n    var sum = 0\n    for num in arr {\n        sum += num\n    }\n    return sum\n}\n\nlet numbers = [1, 2, 3, 4, 5]\nprint(calculateSum(arr: numbers))`,
  kotlin: `fun calculateSum(arr: IntArray): Int {\n    var sum = 0\n    for (num in arr) {\n        sum += num\n    }\n    return sum\n}\n\nfun main() {\n    val numbers = intArrayOf(1, 2, 3, 4, 5)\n    println(calculateSum(numbers))\n}`,
  'objective-c': `#import <Foundation/Foundation.h>\n\nint main(int argc, const char * argv[]) {\n    @autoreleasepool {\n        NSLog(@"Hello, World!");\n    }\n    return 0;\n}`,
  sql: `SELECT * FROM users WHERE status = 'active';`,
  scala: `object Main extends App {\n  val numbers = List(1, 2, 3, 4, 5)\n  println(numbers.sum)\n}`,
  perl: `#!/usr/bin/perl\nuse strict;\nuse warnings;\n\nmy @numbers = (1, 2, 3, 4, 5);\nmy $sum = 0;\n$sum += $_ for @numbers;\nprint "$sum\\n";`,
  r: `numbers <- c(1, 2, 3, 4, 5)\nsum_val <- sum(numbers)\nprint(sum_val)`,
  dart: `int calculateSum(List<int> arr) {\n  int sum = 0;\n  for (int num in arr) {\n    sum += num;\n  }\n  return sum;\n}\n\nvoid main() {\n  var numbers = [1, 2, 3, 4, 5];\n  print(calculateSum(numbers));\n}`,
  lua: `function calculateSum(arr)\n  local sum = 0\n  for i, num in ipairs(arr) do\n    sum = sum + num\n  end\n  return sum\nend\n\nprint(calculateSum({1, 2, 3, 4, 5}))`,
  haskell: `calculateSum :: [Int] -> Int\ncalculateSum = sum\n\nmain = print (calculateSum [1..5])`,
  elixir: `defmodule Math do\n  def sum(list) {\n    Enum.sum(list)\n  }\nend\n\nIO.puts Math.sum([1, 2, 3, 4, 5])`,
  erlang: `-module(math).\n-export([sum/1]).\n\nsum(List) -> lists:sum(List).`,
  clojure: `(defn calculate-sum [arr]\n  (reduce + arr))\n\n(println (calculate-sum [1 2 3 4 5]))`,
  groovy: `def numbers = [1, 2, 3, 4, 5]\nprintln numbers.sum()`,
  powershell: `$numbers = 1..5\n$sum = ($numbers | Measure-Object -Sum).Sum\nWrite-Output $sum`,
  yaml: `name: example\nversion: 1.0\nservices:\n  web:\n    image: nginx`,
  dockerfile: `FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["npm", "start"]`,
  graphql: `type Query {\n  users: [User!]!\n}\n\ntype User {\n  id: ID!\n  name: String!\n}`,

  react: `import React, { useState } from 'react';\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n  \n  // BUG: Mutating state directly\n  const badIncrement = () => {\n    count++;\n    setCount(count);\n  };\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={badIncrement}>Increment</button>\n    </div>\n  );\n}`,
  react_typescript: `import React, { useState } from 'react';\n\nexport default function Counter() {\n  const [count, setCount] = useState<number>(0);\n  \n  // BUG: Mutating state directly\n  const badIncrement = () => {\n    count++;\n    setCount(count);\n  };\n\n  return (\n    <div>\n      <p>Count: {count}</p>\n      <button onClick={badIncrement}>Increment</button>\n    </div>\n  );\n}`,
  'react-native': `import React from 'react';\nimport { Text, View } from 'react-native';\n\nexport default function App() {\n  return (\n    <View>\n      <Text>Hello World</Text>\n    </View>\n  );\n}`,
  'react-native_typescript': `import React from 'react';\nimport { Text, View } from 'react-native';\n\nexport default function App(): JSX.Element {\n  return (\n    <View>\n      <Text>Hello World</Text>\n    </View>\n  );\n}`,
  vue: `<template>\n  <div>{{ count }}</div>\n  <button @click="count++">Increment</button>\n</template>\n\n<script setup>\nimport { ref } from 'vue'\nconst count = ref(0)\n</script>`,
  vue_typescript: `<template>\n  <div>{{ count }}</div>\n  <button @click="count++">Increment</button>\n</template>\n\n<script setup lang="ts">\nimport { ref } from 'vue'\nconst count = ref<number>(0)\n</script>`,
  angular: `import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-root',\n  template: '<button (click)="increment()">{{ count }}</button>'\n})\nexport class AppComponent {\n  count = 0;\n  increment() {\n    this.count++;\n  }\n}`,
  svelte: `<script>\n  let count = 0;\n  function increment() {\n    count += 1;\n  }\n</script>\n\n<button on:click={increment}>\n  Clicked {count} {count === 1 ? 'time' : 'times'}\n</button>`,
  nextjs: `import { cookies } from 'next/headers';\n\nexport default async function Page() {\n  const cookieStore = cookies();\n  const theme = cookieStore.get('theme');\n\n  // SECURITY: Vulnerable to XSS if theme value is not sanitized\n  return (\n    <div dangerouslySetInnerHTML={{ __html: \`Theme is \${theme.value}\` }} />\n  );\n}`,
  nextjs_javascript: `import { cookies } from 'next/headers';\n\nexport default async function Page() {\n  const cookieStore = cookies();\n  const theme = cookieStore.get('theme');\n\n  // SECURITY: Vulnerable to XSS if theme value is not sanitized\n  return (\n    <div dangerouslySetInnerHTML={{ __html: \`Theme is \${theme.value}\` }} />\n  );\n}`,
  nuxtjs: `<template>\n  <div>{{ data }}</div>\n</template>\n\n<script setup>\nconst { data } = await useFetch('/api/hello')\n</script>`,
  express: `const express = require('express');\nconst app = express();\n\n// BUG: Missing middleware to parse JSON\napp.post('/api/data', (req, res) => {\n  const data = req.body;\n  // Will crash because req.body is undefined without express.json()\n  console.log(data.id);\n  res.send('Success');\n});\n\napp.listen(3000);`,
  express_typescript: `import express, { Request, Response } from 'express';\nconst app = express();\n\n// BUG: Missing middleware to parse JSON\napp.post('/api/data', (req: Request, res: Response) => {\n  const data = req.body;\n  // Will crash because req.body is undefined without express.json()\n  console.log(data.id);\n  res.send('Success');\n});\n\napp.listen(3000);`,
  nestjs: `import { Controller, Get } from '@nestjs/common';\n\n@Controller('users')\nexport class UsersController {\n  @Get()\n  findAll(): string {\n    return 'This action returns all users';\n  }\n}`,
  django: `from django.http import HttpResponse\nfrom .models import User\n\ndef get_user(request):\n    # SECURITY: SQL Injection vulnerability via raw query\n    user_id = request.GET.get('id')\n    users = User.objects.raw(f"SELECT * FROM users WHERE id = {user_id}")\n    \n    return HttpResponse(users[0].name)`,
  fastapi: `from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef read_root():\n    return {"Hello": "World"}`,
  flask: `from flask import Flask, request\napp = Flask(__name__)\n\n@app.route('/login', methods=['POST'])\ndef login():\n    # SECURITY: Hardcoded credentials and plain text comparison\n    username = request.form.get('username')\n    password = request.form.get('password')\n    \n    if username == "admin" and password == "secret123":\n        return "Logged in"\n    return "Access denied"`,
  springboot: `import org.springframework.web.bind.annotation.*;\n\n@RestController\npublic class UserController {\n\n    // SMELL: Returning plain string instead of ResponseEntity\n    @GetMapping("/users/{id}")\n    public String getUser(@PathVariable String id) {\n        if(id.equals("1")) {\n            return "Admin User";\n        }\n        return "Regular User";\n    }\n}`,
  springboot_kotlin: `import org.springframework.web.bind.annotation.*\n\n@RestController\nclass UserController {\n\n    // SMELL: Returning plain string instead of ResponseEntity\n    @GetMapping("/users/{id}")\n    fun getUser(@PathVariable id: String): String {\n        if (id == "1") {\n            return "Admin User"\n        }\n        return "Regular User"\n    }\n}`,
  rails: `class UsersController < ApplicationController\n  def index\n    @users = User.all\n    render json: @users\n  end\nend`,
  aspnet: `using Microsoft.AspNetCore.Mvc;\n\n[ApiController]\n[Route("[controller]")]\npublic class UsersController : ControllerBase\n{\n    [HttpGet]\n    public IActionResult Get()\n    {\n        return Ok(new[] { "User1", "User2" });\n    }\n}`,
  laravel: `<?php\n\nnamespace App\\Http\\Controllers;\nuse Illuminate\\Http\\Request;\nuse Illuminate\\Support\\Facades\\DB;\n\nclass UserController extends Controller\n{\n    public function index(Request $request)\n    {\n        // SECURITY: SQL Injection vulnerability\n        $id = $request->input('id');\n        $users = DB::select("SELECT * FROM users WHERE id = " . $id);\n        \n        return response()->json($users);\n    }\n}`,
  symfony: `<?php\n\nnamespace App\\Controller;\nuse Symfony\\Component\\HttpFoundation\\Response;\nuse Symfony\\Component\\Routing\\Annotation\\Route;\n\nclass DefaultController\n{\n    #[Route('/hello/{name}')]\n    public function index(string $name): Response\n    {\n        // SMELL: Direct HTML concatenation\n        return new Response('<html><body>Hello ' . $name . '</body></html>');\n    }\n}`,
  flutter: `import 'package:flutter/material.dart';\n\nvoid main() => runApp(MyApp());\n\nclass MyApp extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      home: Scaffold(\n        appBar: AppBar(title: Text('Flutter App')),\n        body: Center(child: Text('Hello World')),\n      ),\n    );\n  }\n}`
};

const FRAMEWORK_TO_LANGUAGE = {
  react: ['javascript', 'typescript'],
  'react-native': ['javascript', 'typescript'],
  vue: ['javascript', 'typescript'],
  angular: ['typescript', 'javascript'],
  svelte: ['javascript', 'typescript'],
  nextjs: ['typescript', 'javascript'],
  nuxtjs: ['javascript', 'typescript'],
  express: ['javascript', 'typescript'],
  nestjs: ['typescript', 'javascript'],
  django: ['python'],
  fastapi: ['python'],
  flask: ['python'],
  springboot: ['java', 'kotlin'],
  rails: ['ruby'],
  laravel: ['php'],
  symfony: ['php'],
  aspnet: ['csharp'],
  flutter: ['dart']
};

import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function SubmitReviewPage() {
  useDocumentTitle('New Review');
  const navigate = useNavigate();
  
  // 🎛️ UI State
  const [tab, setTab] = useState('snippet');
  const [loading, setLoading] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(false);
  const editorInstanceRef = useRef(null);

  const changeEditorFontSize = (delta) => {
    setEditorFontSize(prev => {
      const next = Math.min(24, Math.max(8, prev + delta));
      editorInstanceRef.current?.updateOptions({ fontSize: next });
      return next;
    });
  };

  const [dragOver, setDragOver] = useState(false); // Used for the nice blue glow when dragging a file

  // 📝 Form Data State
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [framework, setFramework] = useState('none');
  const [code, setCode] = useState('');
  const codeRef = useRef(code);
  codeRef.current = code; // Keep ref updated for callbacks without triggering re-renders
  const [file, setFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  
  const [selectedModules, setSelectedModules] = useState([
    'aiReview', 'documentation', 'bigO'
  ]);

  /**
   * 📁 Handle File Selection (from click or drop)
   * Validates the file size, extracts the name, and auto-detects the programming language!
   */
  const handleFileChange = (f) => {
    if (!f) return;
    
    // 🛑 Prevent massive files from crashing the server!
    const maxMb = 5;
    if (f.size > maxMb * 1024 * 1024) {
      return toast.error(`File too large. Max ${maxMb}MB`);
    }
    
    setFile(f);
    
    // 🪄 Auto-fill the title based on the filename (e.g., "utils.js" -> "utils")
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    
    // 🧠 Auto-detect the programming language using the file extension
    const ext = f.name.split('.').pop().toLowerCase();
    const map = { 
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', 
      py: 'python', java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp', 
      php: 'php', rb: 'ruby', go: 'go', rs: 'rust', html: 'html', 
      css: 'css', scss: 'scss', json: 'json', xml: 'xml', md: 'markdown', 
      sh: 'shell', bash: 'shell', swift: 'swift', kt: 'kotlin', kts: 'kotlin', 
      m: 'objective-c', sql: 'sql', scala: 'scala', pl: 'perl', r: 'r', 
      dart: 'dart', lua: 'lua', hs: 'haskell', ex: 'elixir', exs: 'elixir', 
      erl: 'erlang', clj: 'clojure', groovy: 'groovy', ps1: 'powershell', 
      yml: 'yaml', yaml: 'yaml', dockerfile: 'dockerfile', graphql: 'graphql', gql: 'graphql'
    };
    if (map[ext]) setLanguage(map[ext]);
  };

  /**
   * 🖱️ Handle Drag & Drop
   * Intercepts the browser's default behavior (which is to open the file in a new tab)
   * and passes the dropped file to our handler instead.
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false); // Remove the blue glow
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  }, []);

  /**
   * 🚀 Submit Review to Backend
   * Packages up the user's data (either a raw string or a binary file) 
   * and shoots it over to our Express API.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Please enter a review title');

    setLoading(true);
    try {
      let data;
      
      const backendModules = [...selectedModules];
      if (backendModules.includes('aiReview') && !backendModules.includes('refactoring')) {
        backendModules.push('refactoring');
      }
      
      // 🌿 BRANCH A: They uploaded a File
      if (tab === 'file') {
        if (!file) return toast.error('Please select a file');
        
        // We MUST use FormData when sending binary files over HTTP!
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('language', language);
        formData.append('framework', framework);
        formData.append('selectedModules', JSON.stringify(backendModules));
        
        const res = await reviewsApi.submitFile(formData);
        data = res.data;
      } 
      // 🌿 BRANCH B: They provided a GitHub URL
      else if (tab === 'github') {
        if (!githubUrl.trim()) return toast.error('Please enter a GitHub repository URL');
        
        const res = await reviewsApi.submitGithub({ 
          githubUrl, title, language, framework, selectedModules: backendModules 
        });
        data = res.data;
      }
      // 🌿 BRANCH C: They pasted a Code Snippet
      else {
        if (!code.trim()) return toast.error('Please enter some code');
        
        // Standard JSON payload is fine for strings!
        const res = await reviewsApi.submitSnippet({ 
          code, language, framework, title, selectedModules: backendModules 
        });
        navigate(`/review/${res.data.review.id}`);
        return;
      }
      
      // ✨ Success! Redirect them to the shiny new Review Results page!
      toast.success('Review submitted! Analysis is running...');
      navigate(`/reviews/${data.reviewId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">New Code Review</h1>
        <p className="text-slate-400 text-sm mt-1">Paste a code snippet or upload a file for AI-powered analysis</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title & Language */}
        <div className="card space-y-4">
          <div>
            <label className="label">Review Title <span className="text-red-400">*</span></label>
            <input
              id="submit-title"
              type="text"
              className="input"
              placeholder="e.g. My sorting algorithm, auth.js review..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          {tab !== 'github' && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-64">
              <label className="label">Programming Language <span className="text-red-400">*</span></label>
              {(
                <Select
                  id="submit-language"
                  value={LANGUAGES.find(l => l.value === language)}
                  isSearchable={true}
                  formatOptionLabel={(option) => (
                    <div className="flex items-center gap-2">
                      {option.icon ? (
                        <img 
                          src={option.icon} 
                          alt={option.label} 
                          className="w-4 h-4 object-contain" 
                          style={['rust', 'json', 'markdown', 'shell', 'powershell', 'xml', 'groovy', 'objective-c'].includes(option.value) ? { filter: 'invert(1)' } : {}}
                        />
                      ) : (
                        <FileCode className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{option.label}</span>
                    </div>
                  )}
                  onChange={(selectedOption) => {
                    const newLanguage = selectedOption.value;
                    
                    const getSnippet = (fw, lang) => {
                      if (fw === 'none') return EXAMPLE_SNIPPETS[lang];
                      return EXAMPLE_SNIPPETS[`${fw}_${lang}`] || EXAMPLE_SNIPPETS[fw] || EXAMPLE_SNIPPETS[lang];
                    };
                    
                    const currentSnippet = getSnippet(framework, language);
                    
                    if (codeRef.current === currentSnippet || !codeRef.current) {
                      setCode(getSnippet(framework, newLanguage) || '');
                    }
                    
                    setLanguage(newLanguage);
                  }}
                  options={
                    framework !== 'none' && FRAMEWORK_TO_LANGUAGE[framework]
                      ? LANGUAGES.filter(l => FRAMEWORK_TO_LANGUAGE[framework].includes(l.value))
                      : LANGUAGES
                  }
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      cursor: 'pointer',
                      backgroundColor: 'var(--color-surface-800)',
                      borderColor: state.isFocused ? 'var(--color-brand-500)' : 'var(--color-surface-700)',
                      borderRadius: '0.75rem',
                      padding: '0.1rem 0.25rem',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none',
                      '&:hover': {
                        borderColor: state.isFocused ? 'var(--color-brand-500)' : '#475569'
                      },
                      transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s'
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: 'var(--color-surface-800)',
                      border: '1px solid var(--color-surface-700)',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      zIndex: 50,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }),
                    menuList: (base) => ({
                      ...base,
                      padding: '4px'
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected 
                        ? 'var(--color-brand-600)' 
                        : state.isFocused 
                          ? 'var(--color-surface-700)' 
                          : 'transparent',
                      color: state.isSelected || state.isFocused ? '#f1f5f9' : '#cbd5e1',
                      cursor: 'pointer',
                      borderRadius: '0.5rem',
                      '&:active': {
                        backgroundColor: 'var(--color-brand-500)',
                      }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: '#f1f5f9',
                      fontSize: '0.875rem'
                    }),
                    input: (base) => ({
                      ...base,
                      color: '#f1f5f9'
                    }),
                    indicatorSeparator: (base) => ({
                      ...base,
                      backgroundColor: 'var(--color-surface-700)'
                    }),
                    dropdownIndicator: (base) => ({
                      ...base,
                      color: '#94a3b8',
                      '&:hover': {
                        color: '#cbd5e1'
                      }
                    })
                  }}
                />
              )}
            </div>
            <div className="w-full sm:w-64">
              <label className="label">Framework <span className="text-slate-500 text-xs font-normal ml-1">(Optional)</span></label>
              {(
                <Select
                  id="submit-framework"
                  value={FRAMEWORKS.find(f => f.value === framework)}
                  isSearchable={true}
                  formatOptionLabel={(option) => (
                    <div className="flex items-center gap-2">
                      {option.icon ? (
                        <img 
                          src={option.icon} 
                          alt={option.label} 
                          className="w-4 h-4 object-contain"
                          style={
                            ['nextjs', 'express', 'flask', 'symfony', 'django'].includes(option.value) 
                              ? { filter: 'invert(1)' } 
                              : {}
                          }
                        />
                      ) : (
                        <FileCode className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{option.label}</span>
                    </div>
                  )}
                  onChange={(selectedOption) => {
                    const newFramework = selectedOption.value;
                    
                    // Helper to get the correct snippet for a framework + language combo
                    const getSnippet = (fw, lang) => {
                      if (fw === 'none') return EXAMPLE_SNIPPETS[lang];
                      return EXAMPLE_SNIPPETS[`${fw}_${lang}`] || EXAMPLE_SNIPPETS[fw] || EXAMPLE_SNIPPETS[lang];
                    };
                    
                    const currentSnippet = getSnippet(framework, language);
                    
                    let newLanguage = language;
                    
                    // Auto-switch language if current language is not supported by the new framework
                    const supportedLangs = FRAMEWORK_TO_LANGUAGE[newFramework];
                    if (newFramework !== 'none' && supportedLangs) {
                      if (!supportedLangs.includes(language)) {
                        newLanguage = supportedLangs[0]; // Default to the primary supported language
                        setLanguage(newLanguage);
                      }
                    }
                    
                    // Swap snippet if they had the default one loaded
                    if (codeRef.current === currentSnippet || !codeRef.current) {
                       setCode(getSnippet(newFramework, newLanguage) || '');
                    }
                    
                    setFramework(newFramework);
                  }}
                  options={FRAMEWORKS}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      cursor: 'pointer',
                      backgroundColor: 'var(--color-surface-800)',
                      borderColor: state.isFocused ? 'var(--color-brand-500)' : 'var(--color-surface-700)',
                      borderRadius: '0.75rem',
                      padding: '0.1rem 0.25rem',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none',
                      '&:hover': {
                        borderColor: state.isFocused ? 'var(--color-brand-500)' : '#475569'
                      },
                      transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s'
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: 'var(--color-surface-800)',
                      border: '1px solid var(--color-surface-700)',
                      borderRadius: '0.75rem',
                      overflow: 'hidden',
                      zIndex: 50,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }),
                    menuList: (base) => ({
                      ...base,
                      padding: '4px'
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected 
                        ? 'var(--color-brand-600)' 
                        : state.isFocused 
                          ? 'var(--color-surface-700)' 
                          : 'transparent',
                      color: state.isSelected || state.isFocused ? '#f1f5f9' : '#cbd5e1',
                      cursor: 'pointer',
                      borderRadius: '0.5rem',
                      '&:active': {
                        backgroundColor: 'var(--color-brand-500)',
                      }
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: '#f1f5f9',
                      fontSize: '0.875rem'
                    }),
                    input: (base) => ({
                      ...base,
                      color: '#f1f5f9'
                    }),
                    indicatorSeparator: (base) => ({
                      ...base,
                      backgroundColor: 'var(--color-surface-700)'
                    }),
                    dropdownIndicator: (base) => ({
                      ...base,
                      color: '#94a3b8',
                      '&:hover': {
                        color: '#cbd5e1'
                      }
                    })
                  }}
                />
              )}
            </div>
          </div>
          )}
        </div>

        {/* Source tabs */}
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-800">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              id="tab-snippet"
              className={`tab-btn flex-shrink-0 ${tab === 'snippet' ? 'active' : ''}`}
              onClick={() => setTab('snippet')}
            >
              <Code2 className="w-4 h-4 inline mr-1.5" />
              <span className="hidden sm:inline">Paste </span>Snippet
            </button>
            <button
              type="button"
              id="tab-file"
              className={`tab-btn flex-shrink-0 ${tab === 'file' ? 'active' : ''}`}
              onClick={() => setTab('file')}
            >
              <Upload className="w-4 h-4 inline mr-1.5" />
              <span className="hidden sm:inline">Upload </span>File
            </button>
            <button
              type="button"
              id="tab-github"
              className={`tab-btn flex-shrink-0 ${tab === 'github' ? 'active' : ''}`}
              onClick={() => setTab('github')}
            >
              <GitBranch className="w-4 h-4 inline mr-1.5" />
              GitHub
              <span className={`ml-2 hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider transition-colors ${tab === 'github' ? 'bg-white/20 text-white border-white/30' : 'bg-brand-500/20 text-brand-400 border-brand-500/30'}`}>
                Recommended
              </span>
            </button>
            </div>
            
            {/* Active Language & Framework Badges */}
            {tab !== 'github' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-900 border border-surface-700/50 rounded-xl shadow-inner">
                <img 
                  src={LANGUAGES.find(l => l.value === language)?.icon} 
                  alt={language}
                  className="w-4 h-4 object-contain drop-shadow-sm"
                  style={language === 'rust' ? { filter: 'invert(1)' } : {}}
                />
                <span className="font-semibold text-slate-200 text-sm tracking-wide">{LANGUAGES.find(l => l.value === language)?.label}</span>
              </div>
              
              {framework !== 'none' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-900 border border-surface-700/50 rounded-xl shadow-inner">
                  <img 
                    src={FRAMEWORKS.find(f => f.value === framework)?.icon} 
                    alt={framework}
                    className="w-4 h-4 object-contain drop-shadow-sm"
                    style={['nextjs', 'express', 'flask', 'symfony'].includes(framework) ? { filter: 'invert(1)' } : {}}
                  />
                  <span className="font-semibold text-slate-200 text-sm tracking-wide">{FRAMEWORKS.find(f => f.value === framework)?.label}</span>
                </div>
              )}
            </div>
            )}
          </div>

          {tab === 'snippet' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="label mb-0">Code <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {/* Font size controls */}
                  <div className="flex items-center gap-0 bg-surface-900 border border-surface-700/50 rounded-lg overflow-hidden shrink-0">
                    <button
                      type="button"
                      className="px-2.5 py-1.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
                      onClick={() => changeEditorFontSize(-1)}
                      title="Decrease font size"
                    >A-</button>
                    <span className="text-[10px] text-slate-300 px-1.5 select-none tabular-nums">{Math.round(editorFontSize)}px</span>
                    <button
                      type="button"
                      className="px-2.5 py-1.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
                      onClick={() => changeEditorFontSize(1)}
                      title="Increase font size"
                    >A+</button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setWordWrap(!wordWrap)} 
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border flex items-center gap-1.5 shadow-sm shrink-0 ${wordWrap ? 'bg-brand-600 text-white border-brand-500 hover:bg-brand-500' : 'bg-surface-700 text-slate-200 border-surface-600 hover:text-white hover:bg-surface-600'}`}
                    title="Toggle Word Wrap"
                  >
                    Wrap
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-medium bg-surface-700 text-slate-200 hover:text-white hover:bg-brand-600 hover:border-brand-500 rounded-lg transition-all border border-surface-600 flex items-center gap-1.5 shadow-sm shrink-0"
                    onClick={() => {
                      const snippetKey = framework !== 'none' ? `${framework}_${language}` : language;
                      const snippet = EXAMPLE_SNIPPETS[snippetKey] || EXAMPLE_SNIPPETS[framework] || EXAMPLE_SNIPPETS[language] || EXAMPLE_SNIPPETS.javascript;
                      setCode(snippet);
                    }}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Load Example
                  </button>
                </div>
              </div>
              <div
                className="rounded-xl overflow-hidden border-2 border-slate-600"
                style={{ height: '360px', touchAction: 'pan-x pan-y' }}
              >
                <Editor
                  height="360px"
                  language={language === 'cpp' ? 'cpp' : language === 'csharp' ? 'csharp' : language}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  theme="hc-black"
                  onMount={(editor, monaco) => {
                    editorInstanceRef.current = editor;
                    const cleanupTouch = setupMonacoTouch(editor, monaco, setEditorFontSize);
                    editor.onDidDispose(() => {
                      cleanupTouch();
                    });
                    // Keep px indicator in sync
                    editor.onDidChangeConfiguration(() => {
                      const size = editor.getOption(monaco.editor.EditorOption.fontSize);
                      setEditorFontSize(Math.round(size));
                    });
                  }}
                  beforeMount={(monaco) => {
                    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                      noSemanticValidation: true,
                      noSyntaxValidation: true,
                    });
                    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                      noSemanticValidation: true,
                      noSyntaxValidation: true,
                    });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: editorFontSize,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    mouseWheelZoom: false,
                    wordWrap: wordWrap ? 'on' : 'off',
                    renderLineHighlight: 'none',
                    overviewRulerBorder: false,
                    fixedOverflowWidgets: true,
                    padding: { top: 16, bottom: 16 },
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                  }}
                />
              </div>
              {code && (
                <p className="text-xs text-slate-500">{code.split('\n').length} lines · {code.length} characters</p>
              )}
              <p className="text-xs text-slate-600 sm:hidden text-center">Pinch to zoom · A+ / A− to resize</p>
            </div>
          ) : tab === 'file' ? (
            <div>
              <label className="label">Source File <span className="text-red-400">*</span></label>
              {file ? (
                <div className="flex items-center gap-4 p-4 bg-surface-800 rounded-xl border border-surface-700">
                  <FileCode className="w-8 h-8 text-brand-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="p-1.5 rounded-lg hover:bg-surface-700 text-slate-400 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer
                    ${dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-surface-700 hover:border-surface-600'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium mb-1">Drop your file here</p>
                  <p className="text-slate-500 text-sm">or click to browse</p>
                  <p className="text-slate-600 text-xs mt-3">JS, TS, Python, Java, C, C++, C#, PHP, Ruby, Go, Rust · Max 5MB</p>
                  <input id="file-input" type="file" className="hidden"
                    accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.php,.rb,.go,.rs,.zip"
                    onChange={(e) => handleFileChange(e.target.files[0])} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="label">GitHub Repository URL <span className="text-red-400">*</span></label>
              <div className="flex flex-col gap-2">
                <textarea
                  className="input font-mono text-sm resize-none overflow-hidden leading-relaxed"
                  placeholder="https://github.com/facebook/react"
                  value={githubUrl}
                  rows={1}
                  onChange={(e) => {
                    setGithubUrl(e.target.value);
                    // Auto-grow: reset height then set to scrollHeight
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  style={{ transition: 'height 0.2s ease' }}
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  Must be a public repository. We will download the default branch and analyze the source code.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* AI Modules Selection */}
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-5 mb-8">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">AI Analysis Modules</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select which AI modules to run now. You can always run skipped modules later from the review page.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'static', label: 'Static Code Analysis', desc: 'Syntax, linting & basic checks' },
              { id: 'aiReview', label: 'AI Code Review', desc: 'Bugs, smells, suggestions' },
              { id: 'bigO', label: 'Complexity Analysis', desc: 'Big-O time & space complexity' },
              { id: 'documentation', label: 'Generate Documentation', desc: 'Generate docstrings & markdown' }
            ].map(mod => {
              const isStatic = mod.id === 'static';
              const isChecked = isStatic || selectedModules.includes(mod.id);
              return (
                <label 
                  key={mod.id}
                  className={`
                    flex flex-col p-3 rounded-lg border transition-all duration-200
                    ${isStatic ? 'opacity-70 cursor-not-allowed bg-brand-500/5 border-brand-500/30' : 'cursor-pointer'}
                    ${!isStatic && isChecked 
                      ? 'bg-brand-500/10 border-brand-500/50' 
                      : !isStatic ? 'bg-surface-900 border-surface-700 hover:border-surface-600' : ''
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      type="checkbox" 
                      className={`w-4 h-4 text-brand-500 bg-surface-950 border-surface-600 rounded focus:ring-brand-500 focus:ring-offset-surface-800 ${isStatic ? 'cursor-not-allowed' : ''}`}
                      checked={isChecked}
                      disabled={isStatic}
                      onChange={(e) => {
                        if (isStatic) return;
                        if (e.target.checked) {
                          setSelectedModules(prev => [...prev, mod.id]);
                        } else {
                          // Ensure at least one module is selected? Nah, let them skip all AI if they just want static analysis!
                          setSelectedModules(prev => prev.filter(id => id !== mod.id));
                        }
                      }}
                    />
                    <span className={`text-sm font-medium ${isChecked ? 'text-brand-300' : 'text-slate-300'}`}>
                      {mod.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 pl-6 leading-tight">
                    {mod.desc}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
          <button
            id="submit-review-btn"
            type="submit"
            className="btn-primary px-8"
            disabled={loading}
          >
            {loading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <>Submit for Review <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </form>

      {/* Full Screen Buffering Animation */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-surface-950/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
          <div className="relative flex items-center justify-center w-28 h-28 mb-8">
            <div className="absolute inset-0 rounded-full border-[3px] border-surface-800" />
            <div className="absolute inset-0 rounded-full border-[3px] border-brand-500 border-r-transparent border-t-transparent animate-spin shadow-[0_0_20px_rgba(124,92,255,0.4)]" style={{ animationDuration: '1s' }} />
            <div className="absolute inset-2 rounded-full border-[3px] border-emerald-500 border-l-transparent border-b-transparent animate-spin-reverse shadow-[0_0_15px_rgba(16,185,129,0.3)]" style={{ animationDuration: '1.5s' }} />
            <Zap className="w-8 h-8 text-brand-400 animate-pulse drop-shadow-[0_0_10px_rgba(124,92,255,0.8)]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Preparing Analysis</h2>
          <p className="text-slate-400 text-sm animate-pulse">Uploading data to server...</p>
          <style>{`
            .animate-spin-reverse { animation: spin-reverse linear infinite; }
            @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
          `}</style>
        </div>
      )}
    </div>
  );
}
