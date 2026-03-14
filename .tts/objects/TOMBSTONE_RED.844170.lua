function onLoad(save_state)
	self.addContextMenuItem("Apply Settings", apply, false)
	apply()
end

function apply()
	local outputs = {}
	for i, line in ipairs(splitLines(self.getGMNotes())) do
		local st, en, cap = string.find(line, ": (.+)$")
		outputs[i] = cap
	end
	outputs[1] = tonumber(outputs[1])
	outputs[2] = tonumber(outputs[2])
	outputs[3] = tonumber(outputs[3])
	if outputs[4] == "true" then
		outputs[4] = true
	else
		outputs[4] = false
	end

	local children = self.getChildren()
	if not children or not children[1] then return end
	local c1Children = children[1].getChildren()
	if not c1Children or not c1Children[2] then return end
	local comps = c1Children[2].getComponents()
	if not comps or not comps[2] then return end
	local lightComp = comps[2]

	if outputs[1] then
		lightComp.set("range", outputs[1])
	end
	if outputs[2] then
		lightComp.set("spotAngle", outputs[2])
	end
	lightComp.set("color", self.getColorTint())
	if outputs[3] then
		lightComp.set("intensity", outputs[3])
	end
	lightComp.set("enabled", outputs[4])
end


function splitLines(input)
    local outputs = {}
    for output in input:gmatch("[^\n]+") do
        table.insert(outputs, output)
    end
    return outputs
end