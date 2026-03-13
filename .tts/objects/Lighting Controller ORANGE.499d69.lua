local row_labels = {"Color", "Range", "Angle", "Intensity"}
local label_z = {-1.05, -1.13, -1.09, -1.34}

function onLoad(save_state)
	self.createInput({
		input_function = "guid_input_func",
		function_owner = self,
		label = "GUID",
		position = {-0.02, 0, 0.15},
		rotation = {0, 90, 0},
		scale = {0.4, 0.4, 0.4},
		width = 1400,
		height = 400,
		font_size = 377,
		color = {0.7573, 0.7573, 0.7573, 1},
		alignment = 3,
		validation = 4
	})
	for i = 1, 4 do
		self.createButton({
			click_function = "none",
			function_owner = self,
			label = row_labels[i],
			position = {0.13 - i * 0.5, 0, label_z[i]},
			rotation = {0, 90, 0},
			scale = {0.5, 0.5, 0.5},
			width = 0,
			height = 0,
			font_size = 377,
			font_color = {0.85, 0.85, 0.85, 1}
		})
	end
	for i = 2, 4 do
		self.createInput({
			input_function = row_labels[i] .. "_input_func",
			function_owner = self,
			label = row_labels[i],
			position = {0.13 - i * 0.5, 0, 0.49},
			rotation = {0, 90, 0},
			scale = {0.4, 0.4, 0.4},
			width = 1000,
			height = 250,
			font_size = 227,
			color = {0.7573, 0.7573, 0.7573, 1},
			alignment = 3,
			validation = 3
		})
		self.createButton({
			click_function = row_labels[i] .. "0.5_click_func",
			function_owner = self,
			label = "0.5x",
			position = {0.13 - i * 0.5, 0, -0.38},
			rotation = {0, 90, 0},
			scale = {0.5, 0.5, 0.5},
			width = 300,
			height = 300,
			font_size = 130,
			color = {0.7573, 0.7573, 0.7573, 1}
		})
		self.createButton({
			click_function = row_labels[i] .. "0.9_click_func",
			function_owner = self,
			label = "0.9x",
			position = {0.13 - i * 0.5, 0, -0.09},
			rotation = {0, 90, 0},
			scale = {0.5, 0.5, 0.5},
			width = 300,
			height = 300,
			font_size = 130,
			color = {0.7573, 0.7573, 0.7573, 1}
		})
		self.createButton({
			click_function = row_labels[i] .. "1.1_click_func",
			function_owner = self,
			label = "1.1x",
			position = {0.13 - i * 0.5, 0, 1.08},
			rotation = {0, 90, 0},
			scale = {0.5, 0.5, 0.5},
			width = 300,
			height = 300,
			font_size = 130,
			color = {0.7573, 0.7573, 0.7573, 1}
		})
		self.createButton({
			click_function = row_labels[i] .. "2_click_func",
			function_owner = self,
			label = "2x",
			position = {0.13 - i * 0.5, 0, 1.37},
			rotation = {0, 90, 0},
			scale = {0.5, 0.5, 0.5},
			width = 300,
			height = 300,
			font_size = 130,
			color = {0.7573, 0.7573, 0.7573, 1}
		})
	end
	self.createButton({
		click_function = "light_click_func",
		function_owner = self,
		label = "Light",
		position = {-2.37, 0, -0.31},
		rotation = {0, 90, 0},
		scale = {0.5, 0.5, 0.5},
		width = 900,
		height = 400,
		font_size = 300,
		color = {0.7573, 0.7573, 0.7573, 1}
	})
	self.createButton({
		click_function = "arrow_click_func",
		function_owner = self,
		label = "Arrow",
		position = {-2.37, 0, 0.61},
		rotation = {0, 90, 0},
		scale = {0.5, 0.5, 0.5},
		width = 900,
		height = 400,
		font_size = 300,
		color = {0.7573, 0.7573, 0.7573, 1}
	})
	self.createButton({
		click_function = "turn_on_all_click_func",
		function_owner = self,
		label = "Show All Arrows",
		position = {-3, 0, 0.15},
		rotation = {0, 90, 0},
		scale = {0.5, 0.5, 0.5},
		width = 2300,
		height = 400,
		font_size = 300,
		tooltip = "Show the arrow on every spotlight tool in the scene.",
		color = Color.fromString("Green"):lerp(Color.fromString("White"), 0.7),
	})
	self.createButton({
		click_function = "turn_off_all_click_func",
		function_owner = self,
		label = "Hide All Arrows",
		position = {-3.4, 0, 0.15},
		rotation = {0, 90, 0},
		scale = {0.5, 0.5, 0.5},
		width = 2300,
		height = 400,
		font_size = 300,
		tooltip = "Hide the arrow on every spotlight tool in the scene.",
		color = Color.fromString("Red"):lerp(Color.fromString("White"), 0.7),
	})
	self.createButton({
		click_function = "apply_click_func",
		function_owner = self,
		label = "Apply",
		position = {-0.35, 0.015, 1.26},
		rotation = {0, 90, 0},
		scale = {0.5, 0.5, 0.5},
		width = 500,
		height = 300,
		font_size = 130,
		color = {0.7573, 0.7573, 0.7573, 1}
	})
	self.setColorTint(Color(0, 0, 0, 0))
end

function apply()
	local inputs = self.getInputs()
	local obj = getObjectFromGUID(inputs[1].value)
	if obj then
		local buttons = self.getButtons()
		local enabled = "false"
		if buttons[17].color == Color.fromString("Green"):lerp(Color.fromString("White"), 0.5) then
			enabled = "true"
		end
		local effect_id = 1
		if buttons[18].color == Color.fromString("Green"):lerp(Color.fromString("White"), 0.5) then
			effect_id = 0
		end
		obj.setGMNotes(string.format([[Range: %s
Angle: %s
Intensity: %s
Enabled: %s]], inputs[2].value, inputs[3].value, inputs[4].value, enabled))
		obj.AssetBundle.playLoopingEffect(effect_id)
		obj.setColorTint(self.getColorTint())
		obj.call("apply")
	end
end

function guid_input_func(obj, color, value, still_editing)
	if not still_editing then
		local obj = getObjectFromGUID(value)
		if obj and obj.getGMNotes() ~= "" then
			local outputs = {}
			for i, line in ipairs(splitLines(obj.getGMNotes())) do
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
			for i = 1, 3 do
				local text = tostring(outputs[i])
				if text then
					self.editInput({
						index = i,
						value = text,
					})
				end
			end
			self.setColorTint(obj.getColorTint())
			if outputs[4] then
				self.editButton({
					index = 16,
					color = Color.fromString("Green"):lerp(Color.fromString("White"), 0.5)
				})
			else
				self.editButton({
					index = 16,
					color = Color.fromString("Red"):lerp(Color.fromString("White"), 0.5)
				})
			end
			if obj.AssetBundle.getLoopingEffectIndex() == 0 then
				self.editButton({
					index = 17,
					color = Color.fromString("Green"):lerp(Color.fromString("White"), 0.5)
				})
			else
				self.editButton({
					index = 17,
					color = Color.fromString("Red"):lerp(Color.fromString("White"), 0.5)
				})
			end
		else
			for i = 1, 3 do
				self.editInput({
					index = i,
					value = "",
				})
			end
			self.setColorTint(Color(0, 0, 0, 0))
			self.editButton({
				index = 16,
				color = Color.fromString("Grey"):lerp(Color.fromString("White"), 0.5)
			})
			self.editButton({
				index = 17,
				color = Color.fromString("Grey"):lerp(Color.fromString("White"), 0.5)
			})
		end
	end
end

for i = 2, 4 do
	_G[row_labels[i] .. "_input_func"] = function(obj, color, value, still_editing)
		apply()
	end
	_G[row_labels[i] .. "0.5_click_func"] = function(obj, color, alt)
		local value = tonumber(self.getInputs()[i].value)
		if value then
			self.editInput({
				index = i - 1,
				value = tostring(value * 0.5),
			})
			apply()
		end
	end
	_G[row_labels[i] .. "0.9_click_func"] = function(obj, color, alt)
		local value = tonumber(self.getInputs()[i].value)
		if value then
			self.editInput({
				index = i - 1,
				value = tostring(value * 0.9),
			})
			apply()
		end
	end
	_G[row_labels[i] .. "1.1_click_func"] = function(obj, color, alt)
		local value = tonumber(self.getInputs()[i].value)
		if value then
			self.editInput({
				index = i - 1,
				value = tostring(value * 1.1),
			})
			apply()
		end
	end
	_G[row_labels[i] .. "2_click_func"] = function(obj, color, alt)
		local value = tonumber(self.getInputs()[i].value)
		if value then
			self.editInput({
				index = i - 1,
				value = tostring(value * 2),
			})
			apply()
		end
	end
end

function light_click_func(obj, color, alt)
	if self.getButtons()[17].color == Color.fromString("Green"):lerp(Color.fromString("White"), 0.5) then
		self.editButton({
			index = 16,
			color = Color.fromString("Red"):lerp(Color.fromString("White"), 0.5)
		})
	else
		self.editButton({
			index = 16,
			color = Color.fromString("Green"):lerp(Color.fromString("White"), 0.5)
		})
	end
	apply()
end

function arrow_click_func(obj, color, alt)
	if self.getButtons()[18].color == Color.fromString("Green"):lerp(Color.fromString("White"), 0.5) then
		self.editButton({
			index = 17,
			color = Color.fromString("Red"):lerp(Color.fromString("White"), 0.5)
		})
	else
		self.editButton({
			index = 17,
			color = Color.fromString("Green"):lerp(Color.fromString("White"), 0.5)
		})
	end
	apply()
end

function turn_on_all_click_func(obj, color, alt)
	for _, obj in ipairs(getAllObjects()) do
		if obj.getName() == "Custom Spotlight Tool" then
			obj.AssetBundle.playLoopingEffect(0)
		end
	end
end

function turn_off_all_click_func(obj, color, alt)
	for _, obj in ipairs(getAllObjects()) do
		if obj.getName() == "Custom Spotlight Tool" then
			obj.AssetBundle.playLoopingEffect(1)
		end
	end
end

function apply_click_func(obj, color, alt)
	apply()
end

function splitLines(input)
    local outputs = {}
    for output in input:gmatch("[^\n]+") do
        table.insert(outputs, output)
    end
    return outputs
end

function none()
	return nil
end