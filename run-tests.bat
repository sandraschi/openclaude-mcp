@echo off
setlocal
cd /d "D:\Dev\repos\openclaude-mcp"

echo Installing dev dependencies...
"C:\Users\sandr\.local\bin\uv.exe" sync --extra dev > "D:\Dev\repos\temp\oc_install_out.txt" 2>&1

echo Running smoke + unit tests...
set PYTHONPATH=D:\Dev\repos\openclaude-mcp
"D:\Dev\repos\openclaude-mcp\.venv\Scripts\python.exe" -m pytest tests\smoke\ tests\unit\ -v --tb=short --rootdir="D:\Dev\repos\openclaude-mcp" >> "D:\Dev\repos\temp\oc_test_out.txt" 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> "D:\Dev\repos\temp\oc_test_out.txt"
echo Done. See D:\Dev\repos\temp\oc_test_out.txt

endlocal
