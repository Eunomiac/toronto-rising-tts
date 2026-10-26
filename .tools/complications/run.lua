-- Fengari's CLI can exit successfully after printing an uncaught Lua error.
-- Turn assertion failures into an explicit nonzero process exit for CI.
local ok,err=xpcall(function() dofile(arg[1]) end,debug.traceback)
if not ok then print(err); os.exit(1) end
