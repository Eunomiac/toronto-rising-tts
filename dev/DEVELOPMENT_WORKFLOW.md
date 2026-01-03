# Development Workflow

This document outlines the development workflow and best practices for this project.

## Git Workflow

### Regular Commits

**Important**: All code changes should be committed to the repository regularly without requiring explicit user prompts. This includes:

- Feature implementations
- Bug fixes
- Refactoring
- Documentation updates
- Configuration changes

### Commit Message Guidelines

Commit messages should be clear and descriptive:

- Use present tense ("Add feature" not "Added feature")
- Start with a verb describing the action
- Include relevant details about what changed
- Reference related issues when applicable

**Good Examples:**
```
Implement GUID-based player lighting system

- Refactored lighting module to use GUID-based lookup for player lights
- Player lights no longer require player data for control
- Updated test functions to use new GUID library
```

```
Update documentation for lighting system changes

- Updated DEBUG_FILE_LOGGING.md with logging improvements
- Updated EXTRACTABLE_FUNCTIONS_INDEX.md to reflect current codebase state
```

### When to Commit

Commit changes when:
- A logical unit of work is complete
- A feature is implemented and tested
- Documentation is updated
- Refactoring is complete
- Multiple related changes are made together

**Do not wait for user prompts** - commit proactively after completing work.

## Code Organization

### Module Structure

- `lib/` - Shared libraries and utilities
- `core/` - Core game logic modules
- `dev/` - Development tools and documentation
- `ui/` - UI XML files and related resources

### File Naming

- Use `.ttslua` extension for Lua module files
- Use `.md` for documentation
- Use `.xml` for UI definitions

## Development Best Practices

### Code Style

- Follow existing code patterns and conventions
- Use descriptive variable and function names
- Include JSDoc-style comments for functions
- Maintain consistent indentation (spaces, not tabs)

### Error Handling

- Use `pcall` for safe execution where appropriate
- Provide clear error messages
- Validate inputs before processing

### Testing

- Test changes in TTS before committing
- Update test functions when adding new features
- Document test requirements in `dev/TESTING.md`

## Module Dependencies

### Required Modules

- `lib/constants` - Game constants and configuration
- `lib/guids` - GUID references (G library)
- `lib/util` - Utility functions
- `core/state` - State management
- `core/lighting` - Lighting control
- `core/main` - Main game logic

### Module Loading Order

Modules should be loaded in dependency order:
1. Constants and utilities
2. Core modules
3. Main game logic
4. Debug/testing modules (development only)

## Documentation

### Keeping Documentation Updated

- Update relevant documentation when making changes
- Add examples for new functions
- Document breaking changes
- Keep README files current

### Documentation Files

- `dev/TESTING.md` - Testing guide and test functions
- `dev/GUID_REQUIREMENTS.md` - GUID requirements and setup
- `dev/AVAILABLE_FUNCTIONS.md` - Function reference
- `dev/DEVELOPMENT_WORKFLOW.md` - This file

## AI Assistant Instructions

When working on this project:

1. **Commit Regularly**: Commit changes after completing logical units of work without waiting for user prompts
2. **Clear Messages**: Write descriptive commit messages explaining what changed and why
3. **Update Documentation**: Keep documentation files updated when making changes
4. **Test Changes**: Verify changes work in TTS when possible
5. **Follow Patterns**: Maintain consistency with existing code style and patterns
6. **Error Handling**: Include appropriate error handling and validation
7. **Type Safety**: Use strict TypeScript notation where applicable, avoid `any` type

## Troubleshooting

### Common Issues

- **Module not found**: Check require paths match file locations
- **GUID errors**: Verify GUIDs in `lib/guids.ttslua` match actual TTS objects
- **State persistence**: Ensure state is saved before game reload
- **UI not updating**: Check UI element IDs match between XML and update functions

### Getting Help

- Check `dev/TESTING.md` for test functions
- Review `dev/AVAILABLE_FUNCTIONS.md` for function reference
- Check console output for error messages
- Review git history for recent changes

---

**Last Updated**: After GUID library separation
**Maintained By**: Development Team

